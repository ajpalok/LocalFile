export interface Device {
  id: string;
  name: string;
}

export interface Message {
  message: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  isSent?: boolean;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  transferId: string;
}

export interface FileTransfer {
  transferId: string;
  fileData: FileMetadata;
  senderId: string;
  senderName: string;
  status: 'pending' | 'downloading' | 'completed' | 'cancelled';
  progress?: number;
  chunks?: ArrayBuffer[];
}
