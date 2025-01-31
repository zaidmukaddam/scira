import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST', () => {
  it('should return 400 if no file is uploaded', async () => {
    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toHaveProperty('error', 'No file uploaded');
  });

  it('should return 500 if file upload fails', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Failed to upload file'))
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toHaveProperty('error', 'Failed to upload file');
  });

  it('should return 200 and file details if file is uploaded successfully', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    });

    const mockBlob = {
      url: 'http://localhost/mplx/image-1234567890.txt',
    };

    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockBlob),
      })
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty('name', 'test.txt');
    expect(json).toHaveProperty('contentType', 'text/plain');
    expect(json).toHaveProperty('url', mockBlob.url);
    expect(json).toHaveProperty('size', file.size);
  });
});
