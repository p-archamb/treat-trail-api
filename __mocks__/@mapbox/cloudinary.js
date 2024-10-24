module.exports = {
    v2: {
      config: jest.fn(),
      uploader: {
        upload: jest.fn(() => Promise.resolve({ secure_url: 'https://example.com/image.jpg' })),
        destroy: jest.fn(() => Promise.resolve({ result: 'ok' }))
      }
    }
  };