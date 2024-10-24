module.exports = {
    geocoding: jest.fn(() => ({
      forwardGeocode: jest.fn(() => ({
        send: jest.fn(() => Promise.resolve({
          body: {
            features: [{ center: [0, 0] }]
          }
        }))
      }))
    }))
  };