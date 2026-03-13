// Polyfills MUST be imported before anything else (Supabase needs these)
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('PawtraitSend', () => App);
