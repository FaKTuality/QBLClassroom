import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../Firebase/index.js";
import { RevolvingDot } from "react-loader-spinner";
import { useThreeDots } from "../Hooks";
import { useTopicChange, parseTopic } from "../Hooks";
import { useDispatch } from "react-redux";
import { changeTopic } from "../store/topicConfigSlice";

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
}

export const ViewTopicsStudent = () => {
  const location = useLocation();
  const { userId: studentId, studentName } = location.state;
  const navigate = useNavigate();
  const changedTopics = useTopicChange(); 
  const { showOptions, handleShowOptions, randomClick } = useThreeDots();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topics, setTopics] = useState([]);
  const [ subSnaps, setSubSnaps ] = useState(null); 
  const [ tutorId, setTutorId ] = useState(null); 
  const dispatch = useDispatch(); 
  

useEffect(() => {
    if (!studentId) {
        setLoading(false);
        setError("Student ID not provided.");
        return;
    }

    let unsubscribe;

    const run = async () => {
        try {
            setError(null);

            const docRef = doc(db, "users", studentId);
            const colRef = collection(db, "users", studentId, "topics");

            const [docSnap, querySnap] = await Promise.all([
                getDoc(docRef),
                getDocs(colRef)
            ]);

            const id = docSnap.data().tutorId;

            setTutorId(id);
            setTopics(querySnap.docs);

            const getSubs = async (docSnap) => {
                const colRef2 = collection(
                    db,
                    "users",
                    studentId,
                    "topics",
                    docSnap.id,
                    "submissions"
                );

                return getDocs(colRef2);
            };

            const allPromises = querySnap.docs.map((docSnap) => getSubs(docSnap));
            const SubQuerySnaps = await Promise.all(allPromises);

            setSubSnaps(SubQuerySnaps);

            unsubscribe = onSnapshot(
                doc(db, "admin", id),
                (docSnap) => {
                    console.log("intercepted a write");

                    const { changedTopics } = docSnap.data() || {};
                    dispatch(changeTopic(changedTopics));
                }
            );
        } catch (e) {
            console.log(e);

            setError(
                !navigator.onLine
                    ? "You're currently offline. Please reconnect to the internet and try again."
                    : errorMessages[e.code] ?? "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    run();

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
}, [studentId]);

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
    return <p className="center_piece">{error}</p>;
  }

  const handleClick = (topicName) => {
    navigate("/navstu/classroom", {
      state: { topicName, studentName },
    });
    localStorage.setItem(`LQN${topicName}`, 1)    
  };

  const handleResume = (topicName) => {
    const bookmark = localStorage.getItem(`LQN${topicName}`)
    const LQN = bookmark ? JSON.parse(bookmark) : null
    
    navigate("/navstu/classroom", {
      state: { topicName, LQN, studentName },
    });
  };    
  

  return (
    <div className="center_piece">
      <h2 className="centered">Topics</h2>

      {topics.length === 0 ? 
        <p className="centered">No topics yet.</p>
      
      
      :topics.map((topic, index) => (
        <div
          key={topic.id}
          className="listItem relative"
          onClick={randomClick}
        >
          <div
            className="three-dots for-mobile"
            onClick={(e) => {
              e.stopPropagation();
              handleShowOptions(topic.id);
            }}
          >
            ⋮
          </div>

          <div className={!subSnaps?.[index].empty ? 'green' : 'red'}>{parseCode(parseTopic(topic.id, changedTopics))}</div>

          <div
            className={
              showOptions.id === topic.id && showOptions.show
                ? "action-group"
                : "buttonPair"
            }
          >
            <button
              disabled={localStorage.getItem(`LQN${topic.id}`)}
              className={
                showOptions.id === topic.id && showOptions.show
                  ? "action"
                  : "button"
              }
              onClick={() => handleClick(topic.id)}
            >
              {!subSnaps?.[index].empty ? "Redo" :"Enter Classroom"}
            </button>

            <button
            disabled={!localStorage.getItem(`LQN${topic.id}`)}
              className={
                showOptions.id === topic.id && showOptions.show
                  ? "action"
                  : "button"
              }
              onClick={() => handleResume(topic.id)}
            >
              Resume
            </button>            
          </div>
        </div>
      ))}
    </div>
  );
};


const parseCode = (text) => {
  if (!text) return text;

  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3);

      return (
        <pre key={index}>
          <code>{code}</code>
        </pre>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      const code = part.slice(1, -1);

      return (
        <code key={index}>{code}</code>
      );
    }

    return part;
  });
};