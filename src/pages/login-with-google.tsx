import React from 'react';

const LoginWithGoogle: React.FC = () => {
  const handleLogin = () => {
    // This will send a message to the main process to start the Google login flow
    window.electron.ipcRenderer.send('login-with-google');
  };

  React.useEffect(() => {
    // Listen for a successful login event from the main process
    const handleLoginSuccess = (event, { session, user }) => {
      console.log('Login successful:', { session, user });
      // You can now use the session and user data to update your app's state
    };

    // Listen for a failed login event from the main process
    const handleLoginFailed = (event, errorMessage) => {
      console.error('Login failed:', errorMessage);
    };

    window.electron.ipcRenderer.on('google-login-success', handleLoginSuccess);
    window.electron.ipcRenderer.on('google-login-failed', handleLoginFailed);

    // Clean up the listeners when the component unmounts
    return () => {
      window.electron.ipcRenderer.removeListener('google-login-success', handleLoginSuccess);
      window.electron.ipcRenderer.removeListener('google-login-failed', handleLoginFailed);
    };
  }, []);

  return (
    <div>
      <h1>Login with Google</h1>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
};

export default LoginWithGoogle;
