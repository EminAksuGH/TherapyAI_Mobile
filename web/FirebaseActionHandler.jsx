import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const FirebaseActionHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    if (!mode || !oobCode) {
      // Hatalı link
      navigate("/");
      return;
    }

    if (mode === "resetPassword") {
      navigate(`/change-password?oobCode=${oobCode}`);
    } else if (mode === "verifyEmail") {
      navigate(`/verify-email?oobCode=${oobCode}`);
    } else {
      navigate("/");
    }
  }, [mode, oobCode, navigate]);

  return <p>Yönlendiriliyor...</p>;
};

export default FirebaseActionHandler; 