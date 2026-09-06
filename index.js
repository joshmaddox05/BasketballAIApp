// react-native-gesture-handler must be the very first import in the entry file —
// it installs native handlers before anything renders. Required by the drag-to-dismiss
// sheet in src/components/dbe/BottomSheet.js.
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
