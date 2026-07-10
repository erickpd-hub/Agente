export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  status: 'uploading' | 'processed' | 'error';
  extractedText?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  password?: string;
}

