// WebView là module native, không có trong môi trường test: thay bằng thành phần rỗng.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
