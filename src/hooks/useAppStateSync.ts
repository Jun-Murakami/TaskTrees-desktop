import { useEffect, useState } from 'react';
import { AppState } from '../types/types';
import { isValidAppSettingsState } from '../components/SortableTree/utilities';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { useAppStateStore } from '../store/appStateStore';
import { useTreeStateStore } from '../store/treeStateStore';
import { useDialogStore } from '../store/dialogStore';
import { useError } from './useError';
import { dialog, fs } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/tauri';


export const useAppStateSync = () => {
  const [isLoadedFromExternal, setIsLoadedFromExternal] = useState(false);

  const darkMode = useAppStateStore((state) => state.darkMode);
  const setDarkMode = useAppStateStore((state) => state.setDarkMode);
  const hideDoneItems = useAppStateStore((state) => state.hideDoneItems);
  const setHideDoneItems = useAppStateStore((state) => state.setHideDoneItems);
  const isLoggedIn = useAppStateStore((state) => state.isLoggedIn);

  const items = useTreeStateStore((state) => state.items);
  const currentTreeName = useTreeStateStore((state) => state.currentTreeName);

  const showDialog = useDialogStore((state) => state.showDialog);

  // エラーハンドリング
  const { handleError } = useError();

  // ダークモードの変更を監視 ------------------------------------------------
  useEffect(() => {
    invoke("plugin:theme|set_theme", {
      theme: darkMode ? "dark" : "light"
    });
  }, [darkMode]);

  // ダークモード、完了済みアイテムの非表示設定の監視 ------------------------------------------------
  useEffect(() => {
    const user = getAuth().currentUser;
    const db = getDatabase();
    if (!user || !isLoggedIn || !db) {
      return;
    }
    try {
      const userSettingsRef = ref(db, `users/${user.uid}/settings`);
      onValue(userSettingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data: AppState = snapshot.val();
          if (isValidAppSettingsState(data)) {
            setHideDoneItems(data.hideDoneItems);
            setDarkMode(data.darkMode);
            setIsLoadedFromExternal(true);
          }
        }
      });
    } catch (error) {
      handleError(error);
    }
  }, [isLoggedIn, handleError, setDarkMode, setHideDoneItems]);

  // ダークモード、完了済みアイテムの非表示設定の保存 ------------------------------------------------
  useEffect(() => {
    const debounceSave = setTimeout(() => {
      const user = getAuth().currentUser;
      const db = getDatabase();
      if (!user || !db) {
        return;
      }

      if (isLoadedFromExternal) {
        setIsLoadedFromExternal(false);
        return;
      }

      try {
        const userSettingsRef = ref(db, `users/${user.uid}/settings`);
        set(userSettingsRef, { darkMode, hideDoneItems });
      } catch (error) {
        handleError(error);
      }
    }, 3000); // 3秒のデバウンス

    // コンポーネントがアンマウントされるか、依存配列の値が変更された場合にタイマーをクリア
    return () => clearTimeout(debounceSave);
  }, [darkMode, hideDoneItems, isLoadedFromExternal, handleError]);

  // 現在の日時を取得する
  function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}`;
  }

  // アプリの状態をJSONファイルとしてダウンロードする
  const handleDownloadAppState = async () => {
    const appState = { items, hideDoneItems, darkMode, currentTreeName };
    const appStateJSON = JSON.stringify(appState, null, 2); // 読みやすい形式でJSONを整形
    const defaultPath: dialog.SaveDialogOptions = {
      defaultPath: currentTreeName ? `TaskTree_${currentTreeName}_Backup_${getCurrentDateTime()}.json` : `TaskTree_Backup_${getCurrentDateTime()}.json`
    };

    try {
      const filePath = await dialog.save(defaultPath);
      if (filePath) {
        await fs.writeFile({
          path: filePath,
          contents: appStateJSON,
        });
        await showDialog('ツリーを保存しました。', 'Information');
      }
    } catch (error) {
      await showDialog('ツリーの保存に失敗しました。' + error, 'Error');
    }
  };

  return { handleDownloadAppState };
};

export default useAppStateSync;