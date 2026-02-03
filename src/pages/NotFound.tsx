
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { HomeIcon } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-6">
      <motion.div 
        className="glass-card rounded-2xl p-8 text-center max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-8xl font-bold mb-4 text-primary/80">404</h1>
          <h2 className="text-2xl font-medium mb-4">Page not found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link 
            to="/" 
            className="btn-primary inline-flex items-center justify-center"
          >
            <HomeIcon size={18} className="mr-2" />
            Return Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
