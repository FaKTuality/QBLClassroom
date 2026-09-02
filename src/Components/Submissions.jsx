import { collection, getDocs, QuerySnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { RevolvingDot } from "react-loader-spinner";
import { db } from "../../Firebase/index.js";
import { useNameChange, parseName } from "../Hooks";
import { useTopicChange, parseTopic, parseCode } from "../Hooks";

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

export const Submissions = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subSnap, setSubSnap] = useState(null);
  const [ submittedAt, setSubmittedAt ] = useState(null); 
  const location = useLocation();
  const { topicName, studentId, studentName } = location.state;
  const changedNames = useNameChange(); 
  const changedTopics = useTopicChange(); 
  useEffect(() => {
    if (!studentId) return;

    const fetchSubmissions = async () => {
      try {
        setError(null);

        const colRef = collection(
          db,
          `users/${studentId}/topics/${topicName}/submissions`
        );

        const querySnap = await getDocs(colRef);
        console.log(querySnap.docs[0].data().createdAt)
        const moment = new Date(querySnap.docs[0].data().createdAt.seconds * 1000).toLocaleString()
        setSubmittedAt(moment)
        setSubSnap(querySnap);
         
        
          
      } catch (e) {
        console.log(e)
          setError(
            !navigator.onLine
              ? "You're currently offline. Please reconnect to the internet and try again."
              : errorMessages[e.code] ?? "Something went wrong. Please try again."
          );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [studentId, topicName]);


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
    return (
      <div className="center_piece">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!subSnap || subSnap.empty) {
    return (
      <div className="center_piece">
        <h2 className="header-centered">
          {parseCode(parseTopic(topicName, changedTopics))} Submissions
        </h2>

        <p className="centered">No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="center_piece">
      <h2 className="header-centered">
        {parseCode(parseTopic(topicName, changedTopics))} Submissions for {parseName(studentName, studentId, changedNames)}
      </h2>
      <h3 className="header-centered">
        Submitted at {submittedAt}
      </h3>

      {subSnap.docs.map((docSnap) => {
        const questionNumber = docSnap.id;
        
        const {
          additionalMediaType,
          additionalMediaLink,
          questionText,
          options,
          chosenOption,
          createdAt,
        } = docSnap.data();

        return (
          <div
            key={questionNumber}
            className="question-details"
          >
            <div className="q-number">
               {`question ${parseInt(questionNumber?.slice(8), 10)}`}
            </div>

            {additionalMediaType === "audio" && (
              <audio
                className="q-media"
                src={additionalMediaLink}
                controls
              />
            )}

            {additionalMediaType === "video" && (
              <video
                className="q-media"
                src={additionalMediaLink}
                controls
              />
            )}

            {additionalMediaType === "image" && (
              <img
                className="q-media"
                src={additionalMediaLink}
                alt="Question media"
              />
            )}

            <p className="q-text">
              {parseCode(questionText)}
            </p>

            <ul className="list">
              {options?.map((option) => (
                <li
                  key={option.text}
                  className="listItem"
                >
                  <span
                    className={`option-text ${
                      chosenOption === option.text
                        ? "selected-option"
                        : ""
                    }`}
                  >
                    {parseCode(option.text)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="response-type">
              {parseName(studentName, studentId, changedNames)} selected:{" "}
              <strong>{parseCode(chosenOption)}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
};

