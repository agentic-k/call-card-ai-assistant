import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const Index = () => {
  useEffect(() => {
   console.debug('Index page loaded - redirecting to home');
  }, []);

  return <Navigate to="/" replace />;
};

export default Index;
