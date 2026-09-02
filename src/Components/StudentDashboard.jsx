import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authProvider";
import { RevolvingDot } from "react-loader-spinner";




const errorMessages = {
  "auth/user-not-found":
    "No account exists with that email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/email-already-in-use":
    "An account with this email already exists.",

  "auth/weak-password":
    "Your password is too weak. Try using at least 6 characters.",

  "auth/network-request-failed":
    "It looks like you're offline. Please check your internet connection and try again.",

  "auth/too-many-requests":
    "Too many attempts detected. Please wait a few minutes and try again.",

  "permission-denied":
    "You don't have permission to perform this action.",

  "not-found":
    "The requested information could not be found.",

  "unavailable":
    "Our servers are temporarily unavailable. Please try again later.",

  "deadline-exceeded":
    "The request took too long to complete. Please try again."
};




export const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentName, setStudentName] = useState(null);

  const navigate = useNavigate();
  const { currentUser: user, loading: authLoading } = useAuth();
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setError(null);

        const docRef = doc(db, `users/${userId}`);
        const docSnap = await getDoc(docRef);

        const { name } = docSnap.data();
        setStudentName(name);

      } catch (e) {
          setError(
            !navigator.onLine
              ? "You're currently offline. Please reconnect to the internet and try again."
              : errorMessages[e.code] ?? "Something went wrong. Please try again."
          );
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (authLoading) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
      </div>
    );
  }

  if (error) {
    return <p>{error}</p>;
  }

  const handleViewTopics = () => {
    navigate("/navstu/viewtopicsstudent", {
      state: { userId, studentName },
    });
  };

  return (
    <div className="center_piece">
      <h2 className="centered">{`Welcome ${studentName}!`}</h2>
      <h5 className="centered" style={{color: 'orange'}}>Your knowledge awaits you!</h5>

      <div className="listItem">
        <p
          onClick={handleViewTopics}
          className="button"
        >
          View Topics
        </p>
        <img src="../viewTopicsStudent.png" alt="this image cannot be displayed" className="view-topics"/>
        <img src="../viewTopicsStudentMobile.png" alt="this image cannot be displayed" className="view-topics-mobile"/>
      </div>
    </div>
  );
};