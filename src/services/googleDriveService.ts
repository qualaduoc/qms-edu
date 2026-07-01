import { google } from 'googleapis';

// Hàm helper để chuẩn bị private key từ env
const getPrivateKey = () => {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!privateKey) return '';
  // Xử lý trường hợp key có chứa ký tự xuống dòng \n bị escape thành \\n
  return privateKey.replace(/\\n/g, '\n');
};

// Khởi tạo Google Auth client với Service Account
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
 * Tạo một thư mục mới trên Google Drive
 * @param folderName Tên thư mục cần tạo
 * @param parentId ID của thư mục cha
 * @returns ID của thư mục mới tạo
 */
export async function createFolder(folderName: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  
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

    if (!response.data.id) {
      throw new Error('Failed to create folder - ID not returned');
    }

    return response.data.id;
  } catch (error) {
    console.error('Error creating folder on Google Drive:', error);
    throw error;
  }
}

/**
 * Tìm kiếm thư mục theo tên trong thư mục cha
 * @param folderName Tên thư mục cần tìm
 * @param parentId ID thư mục cha
 * @returns ID thư mục nếu tìm thấy, ngược lại trả về null
 */
export async function findFolder(folderName: string, parentId: string): Promise<string | null> {
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
 * @param folderName Tên thư mục
 * @param parentId ID thư mục cha
 * @returns ID thư mục
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
 * @param fileBuffer Buffer nội dung file
 * @param fileName Tên file khi lưu trên Drive
 * @param mimeType Định dạng file (ví dụ: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * @param parentId ID thư mục cha lưu file
 * @returns Object chứa fileId và webViewLink
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentId: string
): Promise<{ fileId: string; fileUrl: string }> {
  const drive = getDriveClient();

  try {
    const fileMetadata = {
      name: fileName,
      parents: [parentId],
    };

    // Tạo stream từ buffer để upload
    const { Readable } = require('stream');
    const media = {
      mimeType: mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;
    const fileUrl = response.data.webViewLink;

    if (!fileId || !fileUrl) {
      throw new Error('Upload failed - file ID or URL not returned');
    }

    // Phân quyền cho bất cứ ai có link đều có thể xem được (để BGH click xem nhanh)
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('Could not set public read permissions for file:', permError);
    }

    return { fileId, fileUrl };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw error;
  }
}

/**
 * Quét và liệt kê toàn bộ file trong một thư mục cụ thể
 * @param folderId ID thư mục cần quét
 * @returns Danh sách các file (id, name, webViewLink, createdTime)
 */
export async function listFilesInFolder(folderId: string): Promise<Array<{
  id: string;
  name: string;
  url: string;
  createdTime: string;
}>> {
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
 * @param fileId ID file cần xóa
 */
export async function deleteFile(fileId: string): Promise<void> {
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
