import { Text, TextInput } from 'react-native';
import { fontFamily } from './theme';

// Set default font family for all Text components using defaultProps
(Text as any).defaultProps = {
  ...(Text as any).defaultProps,
  style: [{ fontFamily: fontFamily.primary }, (Text as any).defaultProps?.style],
};

// Set default font family for all TextInput components using defaultProps
(TextInput as any).defaultProps = {
  ...(TextInput as any).defaultProps,
  style: [{ fontFamily: fontFamily.primary }, (TextInput as any).defaultProps?.style],
}; 