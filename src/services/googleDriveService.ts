import { google } from 'googleapis';

const webAppUrl = process.env.GOOGLE_DRIVE_WEBAPP_URL;

// Hàm helper gọi Google Apps Script Web App nếu có cấu hình
async function callWebApp(action: string, payload: any): Promise<any> {
  if (!webAppUrl) {
    throw new Error('Chưa cấu hình GOOGLE_DRIVE_WEBAPP_URL trong file .env.local');
  }
  
  const res = await fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  
  if (!res.ok) {
    throw new Error(`Web App kết nối thất bại với mã lỗi: ${res.status}`);
  }
  
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Lỗi xử lý bên trong Web App Google Drive.');
  }
  
  return data;
}

// Hàm helper để chuẩn bị private key từ env
const getPrivateKey = () => {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!privateKey) return '';
  return privateKey.replace(/\\n/g, '\n');
};

// Khởi tạo Google Auth client với Service Account (Dùng làm phương án dự phòng)
const getDriveClient = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();

  if (!email || !privateKey) {
    throw new Error('Google Service Account credentials are not configured in environment variables.');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
};

/**
 * Chuyển quyền sở hữu (transfer ownership) của file/folder sang tài khoản Gmail chính của Khầy
 */
export async function transferOwnership(fileId: string, emailAddress: string): Promise<void> {
  const drive = getDriveClient();
  try {
    await drive.permissions.create({
      fileId: fileId,
      transferOwnership: true,
      requestBody: {
        role: 'owner',
        type: 'user',
        emailAddress: emailAddress,
      },
    });
  } catch (err: any) {
    console.warn(`[Drive API] Lỗi/Cảnh báo chuyển quyền sở hữu cho ${fileId}:`, err.message || err);
  }
}

/**
 * Tạo một thư mục mới trên Google Drive
 */
export async function createFolder(folderName: string, parentId: string): Promise<string> {
  // Nếu sử dụng Google Apps Script Web App (Khuyên dùng cho tài khoản cá nhân để tránh lỗi quota)
  if (webAppUrl) {
    console.log(`[Apps Script API] Tạo thư mục: ${folderName} dưới thư mục cha ${parentId}`);
    const result = await callWebApp('createFolder', { folderName, parentId });
    return result.folderId;
  }

  // Fallback về Service Account
  const drive = getDriveClient();
  const ownerEmail = process.env.SMTP_USER || 'ledinhphuonglanltv@gmail.com';
  
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error('Failed to create folder - ID not returned');
    }

    await transferOwnership(folderId, ownerEmail);
    return folderId;
  } catch (error) {
    console.error('Error creating folder on Google Drive:', error);
    throw error;
  }
}

/**
 * Tìm kiếm thư mục theo tên trong thư mục cha
 */
export async function findFolder(folderName: string, parentId: string): Promise<string | null> {
  if (webAppUrl) {
    const result = await callWebApp('findFolder', { folderName, parentId });
    return result.folderId;
  }

  const drive = getDriveClient();
  try {
    const q = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1,
    });

    const files = response.data.files;
    if (files && files.length > 0) {
      return files[0].id || null;
    }
    return null;
  } catch (error) {
    console.error('Error finding folder on Google Drive:', error);
    throw error;
  }
}

/**
 * Lấy thư mục hoặc tạo mới nếu chưa tồn tại
 */
export async function getOrCreateFolder(folderName: string, parentId: string): Promise<string> {
  const existingFolderId = await findFolder(folderName, parentId);
  if (existingFolderId) {
    return existingFolderId;
  }
  return await createFolder(folderName, parentId);
}

/**
 * Upload file từ Buffer lên Google Drive
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentId: string
): Promise<{ fileId: string; fileUrl: string }> {
  // Nếu sử dụng Google Apps Script Web App (Khắc phục triệt để lỗi Quota của Service Account)
  if (webAppUrl) {
    console.log(`[Apps Script API] Đang upload file: ${fileName} lên thư mục ${parentId}`);
    const fileBase64 = fileBuffer.toString('base64');
    const result = await callWebApp('uploadFile', {
      fileName,
      mimeType,
      parentId,
      fileContent: fileBase64,
    });
    return { fileId: result.fileId, fileUrl: result.fileUrl };
  }

  // Fallback về Service Account
  const drive = getDriveClient();
  const ownerEmail = process.env.SMTP_USER || 'ledinhphuonglanltv@gmail.com';

  try {
    const fileMetadata = {
      name: fileName,
      parents: [parentId],
    };

    const emptyFileResponse = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    const fileId = emptyFileResponse.data.id;
    if (!fileId) {
      throw new Error('Không thể tạo file trống trên Google Drive.');
    }

    await transferOwnership(fileId, ownerEmail);

    const { Readable } = require('stream');
    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer),
    };

    const updateResponse = await drive.files.update({
      fileId: fileId,
      media: media,
      fields: 'id, webViewLink',
    });

    const fileUrl = updateResponse.data.webViewLink;
    if (!fileUrl) {
      throw new Error('Upload nội dung thất bại - không lấy được URL.');
    }

    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('Không thể cài đặt quyền xem công khai cho file:', permError);
    }

    return { fileId, fileUrl };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

/**
 * Quét và liệt kê toàn bộ file trong một thư mục cụ thể
 */
export async function listFilesInFolder(folderId: string): Promise<Array<{
  id: string;
  name: string;
  url: string;
  createdTime: string;
}>> {
  if (webAppUrl) {
    const result = await callWebApp('listFiles', { folderId });
    return result.files;
  }

  const drive = getDriveClient();
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q,
      spaces: 'drive',
      fields: 'files(id, name, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = response.data.files || [];
    return files.map(file => ({
      id: file.id || '',
      name: file.name || '',
      url: file.webViewLink || '',
      createdTime: file.createdTime || '',
    }));
  } catch (error) {
    console.error('Error listing files in Google Drive folder:', error);
    throw error;
  }
}

/**
 * Xóa một file khỏi Google Drive
 */
export async function deleteFile(fileId: string): Promise<void> {
  if (webAppUrl) {
    await callWebApp('deleteFile', { fileId });
    return;
  }

  const drive = getDriveClient();
  try {
    await drive.files.delete({
      fileId,
    });
  } catch (error) {
    console.error('Error deleting file from Google Drive:', error);
    throw error;
  }
}
