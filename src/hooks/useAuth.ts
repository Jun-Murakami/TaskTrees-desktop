import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { getDatabase, remove, ref } from 'firebase/database';
import { useAppStateStore } from '../store/appStateStore';
import { useTreeStateStore } from '../store/treeStateStore';
import { invoke } from '@tauri-apps/api';
import { listen } from '@tauri-apps/api/event';
import callbackTemplate from './../theme/callback.template';
import { open } from '@tauri-apps/api/shell';

// Firebaseの設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_DATABASE_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGE_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export const useAuth = () => {
  const setIsLoading = useAppStateStore((state) => state.setIsLoading);
  const setIsLoggedIn = useAppStateStore((state) => state.setIsLoggedIn);
  const setSystemMessage = useAppStateStore((state) => state.setSystemMessage);
  const isWaitingForDelete = useAppStateStore((state) => state.isWaitingForDelete);
  const setIsWaitingForDelete = useAppStateStore((state) => state.setIsWaitingForDelete);
  const setItems = useTreeStateStore((state) => state.setItems);
  const setTreesList = useTreeStateStore((state) => state.setTreesList);
  const setCurrentTree = useTreeStateStore((state) => state.setCurrentTree);
  const setCurrentTreeName = useTreeStateStore((state) => state.setCurrentTreeName);
  const setCurrentTreeMembers = useTreeStateStore((state) => state.setCurrentTreeMembers);

  // ログイン状態の監視
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const openBrowserToConsent = (port: string) => {
    // Replace CLIEN_ID_FROM_FIREBASE
    // Must allow localhost as redirect_uri for CLIENT_ID on GCP: https://console.cloud.google.com/apis/credentials
    return open('https://accounts.google.com/o/oauth2/auth?' +
      'response_type=token&' +
      `client_id=${import.meta.env.VITE_CLIENT_ID}&` +
      `redirect_uri=http%3A//localhost:${port}&` +
      'scope=email%20profile%20openid&' +
      'prompt=consent'
    );
  };

  const openGoogleSignIn = (port: string) => {
    return new Promise((resolve, reject) => {
      openBrowserToConsent(port).then(resolve).catch(reject);
    });
  };

  const googleSignIn = (payload: string) => {
    const url = new URL(payload);
    // Get `access_token` from redirect_uri param
    const access_token = new URLSearchParams(url.hash.substring(1)).get('access_token');

    if (!access_token) return;

    const auth = getAuth();

    const credential = GoogleAuthProvider.credential(null, access_token);

    signInWithCredential(auth, credential)
      .then(() => {
        setIsLoggedIn(true);
        setSystemMessage(null);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(errorCode, errorMessage);
        setSystemMessage('ログイン中にエラーが発生しました。ErroCode:' + errorCode + ' ' + errorMessage);
      });
  };

  // Googleログイン
  const handleLogin = () => {
    // Start tauri oauth plugin. When receive first request
    // When it starts, will return the server port
    // it will kill the server
    invoke('plugin:oauth|start', {
      config: {
        // Optional config, but use here to more friendly callback page
        response: callbackTemplate,
      },
    }).then((port) => {
      openGoogleSignIn(port as string);
    });

    // Wait for callback from tauri oauth plugin
    listen('oauth://url', (data) => {
      googleSignIn(data.payload as string);
      console.log('fire');
    });
  };

  // ログアウト
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        setIsLoggedIn(false);
        setItems([]);
        setTreesList([]);
        setCurrentTree(null);
        setCurrentTreeName(null);
        setCurrentTreeMembers(null);
        if (!isWaitingForDelete) setSystemMessage('ログアウトしました。');
      })
      .catch((error) => {
        console.error(error);
      });
  };

  // アカウント削除
  const handleDeleteAccount = () => {
    const user = auth.currentUser;
    if (user) {
      const appStateRef = ref(db, `users/${user.uid}/appState`);
      remove(appStateRef)
        .then(() => {
          console.log('データが正常に削除されました。');
        })
        .catch((error) => {
          console.error('データの削除中にエラーが発生しました:', error);
        });
      user
        .delete()
        .then(() => {
          handleLogout();
          setSystemMessage('アカウントが削除されました。');
        })
        .catch((error) => {
          if (error instanceof Error) {
            setSystemMessage('アカウントの削除中にエラーが発生しました。管理者に連絡してください。 : ' + error.message);
          } else {
            setSystemMessage('アカウントの削除中にエラーが発生しました。管理者に連絡してください。 : 不明なエラー');
          }
          handleLogout();
        });
    } else {
      setSystemMessage('ユーザーがログインしていません。');
    }
    setIsWaitingForDelete(false);
  };
  return { handleLogin, handleLogout, handleDeleteAccount };
};