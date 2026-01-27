import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthViewModel } from "@/viewmodels/useAuthViewModel";

interface ProtectedRouteProps {
  element: React.ReactElement;
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { session } = useAuthViewModel();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure session is fully initialized
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return element;
}
