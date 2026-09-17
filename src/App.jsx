import { Routes, Route } from "react-router-dom";
import { QuestionForm } from "./Components/QuestionForm";
import { ViewTopics } from "./Components/ViewTopics";
import { TopicMembers } from "./Components/TopicMembers";
import { TopicQuestions } from "./Components/TopicQuestions";
import { Submissions } from "./Components/Submissions";
import { ViewTopicsStudent } from "./Components/ViewTopicsStudent";
import SignIn from "./Components/signIn";
import SignUp from "./Components/signUp";
import { TutorDashboard } from "./Components/TutorDashboard";
import { StudentDashboard } from "./Components/StudentDashboard";
import { Home } from "./Components/Home";
import { NavigationTutor } from "./Components/NavigationTutor";
import { NavigationStudent } from "./Components/NavStudent";
import { NavigationAuth } from "./Components/NavAuth";
import { ClassRoom } from "./Components/ClassRoom.jsx";
import { AccessRestricted } from "./Components/accessRestricted";
import Settings from "./Components/Settings";
import { Students } from "./Components/Students";
import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { useDispatch } from "react-redux";
import {
  changeName,
  changeTopic,
  setAdFreeStatus,
} from "./store/topicConfigSlice";
import { db } from "../Firebase/index.js";
import RemoveAds from "./Components/AdsRemove.jsx";
import { useAuth } from "./store/authProvider";
import TOS from "./Components/TOS.jsx";
import PrivacyPolicy from "./Components/PrivacyPolicy.jsx";
import "./App.css";

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
    "The request took too long to complete. Please try again.",
};

const App = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const { currentUser: user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchAppData = async () => {
      console.log("running effect function");

      try {
        /*
         * Get the Firebase ID token.
         * This is sent to the get-payment-status
         * Edge Function so the server can authenticate
         * the current user.
         */
        const idToken = await user.getIdToken();

        /*
         * Ask the Edge Function for the user's
         * payment entitlement.
         */
        const paymentResponse = await fetch(
          "https://groobjilaxzmbnveyjux.supabase.co/functions/v1/get-payment-status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        const paymentResult =
          await paymentResponse.json();

        if (!paymentResponse.ok) {
          throw new Error(
            paymentResult.error ??
              "Could not retrieve payment status."
          );
        }

        /*
         * Update the local Redux entitlement state.
         */
        dispatch(
          setAdFreeStatus(
            paymentResult.hasAdFree === true
          )
        );

        /*
         * Get the user's classroom information.
         */
        const docRef = doc(db, "admin", user.uid);
        const docRef2 = doc(db, "users", user.uid);

        const docSnap = await getDoc(docRef);

        /*
         * No admin document means this is a student.
         */
        if (!docSnap.exists()) {
          const docSnap2 = await getDoc(docRef2);

          const { tutorId } =
            docSnap2.data() || {};

          if (tutorId) {
            const docSnap3 = await getDoc(
              doc(db, "admin", tutorId)
            );

            const { changedTopics } =
              docSnap3.data() || {};

            dispatch(changeTopic(changedTopics));

            console.log(
              "I have dispatched changed topics for the student",
              changedTopics
            );
          }
        } else {
          /*
           * This is a tutor.
           */
          const {
            changedNames,
            changedTopics,
          } = docSnap.data() || {};

          dispatch(changeName(changedNames));
          dispatch(changeTopic(changedTopics));
        }
      } catch (e) {
        console.log(e);

        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ??
                e.message ??
                "Something went wrong. Please try again."
        );
      }
    };

    fetchAppData();
  }, [authLoading, user, dispatch]);

  if (error) {
    return (
      <p className="center_piece">
        {error}
      </p>
    );
  }

  return (
    <Routes>
      <Route
        path="/accessrestricted"
        element={<AccessRestricted />}
      />

      <Route
        path="/navauth"
        element={<NavigationAuth />}
      >
        <Route
          path="signup/:inviteDoc"
          element={<SignUp />}
        />
        <Route
          path="signup"
          element={<SignUp />}
        />
        <Route
          path="signin"
          element={<SignIn />}
        />
        <Route
          path="tos"
          element={<TOS />}
        />
        <Route
          path="privacypolicy"
          element={<PrivacyPolicy />}
        />
      </Route>

      <Route
        path="/"
        element={<NavigationAuth />}
      >
        <Route
          index
          element={<Home />}
        />
      </Route>

      <Route
        path="/navstu"
        element={<NavigationStudent />}
      >
        <Route
          path="settings"
          element={<Settings />}
        />
        <Route
          path="studentdashboard"
          element={<StudentDashboard />}
        />
        <Route
          path="viewtopicsstudent"
          element={<ViewTopicsStudent />}
        />
        <Route
          path="classroom"
          element={<ClassRoom />}
        />
      </Route>

      <Route
        path="/navtut"
        element={<NavigationTutor />}
      >
        <Route
          path="students"
          element={<Students />}
        />
        <Route
          path="settings"
          element={<Settings />}
        />
        <Route
          path="tutordashboard"
          element={<TutorDashboard />}
        />
        <Route
          path="questionForm"
          element={<QuestionForm />}
        />
        <Route
          path="submissions"
          element={<Submissions />}
        />
        <Route
          path="topicmembers"
          element={<TopicMembers />}
        />
        <Route
          path="topicquestions"
          element={<TopicQuestions />}
        />
        <Route
          path="viewtopics"
          element={<ViewTopics />}
        />
        <Route
          path="removeads"
          element={<RemoveAds />}
        />
      </Route>
    </Routes>
  );
};

export default App;