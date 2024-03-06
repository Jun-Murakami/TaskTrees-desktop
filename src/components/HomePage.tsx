import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppStateSync } from '../hooks/useAppStateSync';
import { useTreeManagement } from '../hooks/useTreeManagement';
import { useAuth } from '../hooks/useAuth';
import { ModalDialog } from '../components/ModalDialog';
import { InputDialog } from '../components/InputDialog';
import { ResponsiveDrawer } from './ResponsiveDrawer';
import { Button, CircularProgress, Typography, Paper, Box } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { TreeSettingsAccordion } from './TreeSettingsAccordion';
import { SortableTree } from './SortableTree/SortableTree';
import { useDialogStore } from '../store/dialogStore';
import { useInputDialogStore } from '../store/dialogStore';
import { useAppStateStore } from '../store/appStateStore';
import { useTreeStateStore } from '../store/treeStateStore';

export function HomePage() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);

  const isLoading = useAppStateStore((state) => state.isLoading); // ローディング中の状態
  const isLoggedIn = useAppStateStore((state) => state.isLoggedIn); // ログイン状態
  const systemMessage = useAppStateStore((state) => state.systemMessage); // システムメッセージ
  const isWaitingForDelete = useAppStateStore((state) => state.isWaitingForDelete); // アカウント削除の確認状態
  const setIsWaitingForDelete = useAppStateStore((state) => state.setIsWaitingForDelete); // アカウント削除の確認状態を変更
  const currentTree = useTreeStateStore((state) => state.currentTree);

  const isDialogVisible = useDialogStore((state: { isDialogVisible: boolean }) => state.isDialogVisible);
  const isInputDialogVisible = useInputDialogStore((state: { isDialogVisible: boolean }) => state.isDialogVisible);

  // 認証状態の監視とログイン、ログアウトを行うカスタムフック
  const { handleLogin, handleLogout, handleDeleteAccount } = useAuth();

  // アプリの状態の読み込みと保存を行うカスタムフック
  const { handleDownloadAppState } = useAppStateSync();

  //ツリーの状態を同期するカスタムフック
  const { deleteTree, handleCreateNewTree, handleListClick, handleFileUpload } = useTreeManagement();

  // アプリバージョン情報の取得
  useEffect(() => {
    // 現在のアプリバージョンを取得
    const fetchCurrentVersion = async () => {
      const version = await getVersion();
      setCurrentVersion(version);
    };

    // 最新バージョン情報を取得
    const fetchLatestVersion = async () => {
      try {
        const response = await fetch('https://tasktree-s.web.app/version.json');
        const data = await response.json();
        console.log(data);
        setLatestVersion(data.version);
        setUpdateMessage(data.message);
      } catch (error) {
        setLatestVersion('※バージョン情報の取得に失敗しました。' + error);
      }
    };

    fetchCurrentVersion();
    fetchLatestVersion();
  }, [isLoggedIn]);

  // 新しいバージョンがあるかどうかを判定
  useEffect(() => {
    if (currentVersion && latestVersion) {
      const currentVersionArray = currentVersion.split('.').map((v) => parseInt(v));
      const latestVersionArray = latestVersion.split('.').map((v) => parseInt(v));
      if (currentVersionArray[0] < latestVersionArray[0]) {
        setIsNewVersionAvailable(true);
      } else if (currentVersionArray[0] === latestVersionArray[0]) {
        if (currentVersionArray[1] < latestVersionArray[1]) {
          setIsNewVersionAvailable(true);
        } else if (currentVersionArray[1] === latestVersionArray[1]) {
          if (currentVersionArray[2] < latestVersionArray[2]) {
            setIsNewVersionAvailable(true);
          }
        }
      }
    }
  }, [currentVersion, latestVersion]);

  return (
    <>
      {isLoggedIn ? (
        !isWaitingForDelete ? (
          // ログイン後のメイン画面
          <>
            {isDialogVisible && <ModalDialog />}
            {isInputDialogVisible && <InputDialog />}
            <ResponsiveDrawer
              handleCreateNewTree={handleCreateNewTree}
              handleListClick={handleListClick}
              handleFileUpload={handleFileUpload}
              handleDownloadAppState={handleDownloadAppState}
              handleLogout={handleLogout}
            />
            <Box
              sx={{
                marginLeft: { sm: '240px' }, // smサイズの時だけ左マージンを240pxに設定
                width: { xs: '100%', sm: 'calc(100% - 240px)' }, // smサイズの時だけ幅をResponsiveDrawerの幅を考慮して調整}}
                minHeight: currentTree !== null ? '100vh' : 'auto',
              }}
            >
              {currentTree ? (
                <>
                  <TreeSettingsAccordion deleteTree={deleteTree} />
                  <Box
                    sx={{
                      maxWidth: '900px', // 最大幅を指定
                      width: '100%', // 横幅いっぱいに広がる
                      margin: '0 auto', // 中央寄せ
                    }}
                  >
                    <SortableTree collapsible indicator removable />
                  </Box>
                </>
              ) : (
                <Typography variant='h3'>
                  <img
                    src='/TaskTrees.svg'
                    alt='Task Tree'
                    style={{ width: '35px', height: '35px', marginTop: '30px', marginRight: '10px' }}
                  />
                  TaskTrees
                </Typography>
              )}
            </Box>
            {isLoading && (
              <CircularProgress
                sx={{
                  marginTop: 4,
                  display: 'block',
                  position: 'absolute',
                  left: { xs: 'calc(50% - 20px)', sm: 'calc(50% + 100px)' },
                }}
              />
            )}
          </>
        ) : (
          // アカウント削除の確認ダイアログ
          <>
            <Typography sx={{ marginBottom: 0 }} variant='h3'>
              <img src='/TaskTrees.svg' alt='Task Tree' style={{ width: '35px', height: '35px', marginRight: '10px' }} />
              TaskTrees
            </Typography>
            <Box sx={{ width: '100%', marginTop: -1, marginBottom: 4 }}>
              <Typography variant='caption' sx={{ width: '100%' }}>
                Team Edition
              </Typography>
            </Box>
            <Typography variant='body2' sx={{ marginY: 4 }}>
              アプリケーションのすべてのデータとアカウント情報が削除されます。この操作は取り消せません。削除を実行しますか？
            </Typography>
            <Button
              onClick={handleDeleteAccount}
              variant={'contained'}
              startIcon={<DeleteForeverIcon />}
              color='error'
              sx={{ marginRight: 4 }}
            >
              削除する
            </Button>
            <Button onClick={() => setIsWaitingForDelete(false)} variant={'outlined'}>
              キャンセル
            </Button>
          </>
        )
      ) : (
        // ログイン前の画面
        <>
          <Typography sx={{ marginBottom: 0 }} variant='h3'>
            <img src='/TaskTrees.svg' alt='Task Tree' style={{ width: '35px', height: '35px', marginRight: '10px' }} />
            TaskTrees
          </Typography>
          <Box sx={{ width: '100%', marginTop: -1, marginBottom: 4 }}>
            <Typography variant='caption' sx={{ width: '100%' }}>
              Team Edition
            </Typography>
          </Box>
          {isLoading ? (
            <CircularProgress
              sx={{
                marginY: 4,
                display: 'block',
                marginX: 'auto',
              }}
            />
          ) : (
            <Button onClick={() => handleLogin()} variant={'contained'}>
              Googleでログイン
            </Button>
          )}
          {systemMessage && (
            <Typography variant='body2' sx={{ marginY: 4 }}>
              {systemMessage}
            </Typography>
          )}

          <Paper sx={{ maxWidth: 300, margin: 'auto', marginTop: 4 }}>
            <Typography variant='body2' sx={{ textAlign: 'left', p: 2 }} gutterBottom>
              ver{currentVersion}
              <br />
              <br />
              {isNewVersionAvailable ? (
                <>
                  {`最新バージョン: ${latestVersion} が利用可能です。`}
                  <a href='https://tasktree-s.web.app/download' target='_blank' rel='noreferrer'>
                    ダウンロード
                  </a>
                  <br />
                  <br />
                  <hr />
                  {updateMessage}
                </>
              ) : (
                <>
                  最新バージョン: {latestVersion}
                  <hr />
                  お使いのバージョンは最新です。
                  <br />
                </>
              )}
            </Typography>
          </Paper>
          <Typography variant='caption' sx={{ width: '100%', minWidth: '100%' }}>
            <a href='mailto:app@bucketrelay.com' target='_blank' rel='noreferrer'>
              ©{new Date().getFullYear()} Jun Murakami
            </a>{' '}
            |{' '}
            <a href='https://github.com/Jun-Murakami/TaskTrees-desktop' target='_blank' rel='noreferrer'>
              GitHub
            </a>{' '}
            | <a href='/privacy-policy'>Privacy policy</a>
          </Typography>
          <Typography variant='caption' sx={{ width: '100%' }}></Typography>
        </>
      )}
    </>
  );
}
