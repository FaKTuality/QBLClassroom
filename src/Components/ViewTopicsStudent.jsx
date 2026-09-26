import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../Firebase/index.js";
import { RevolvingDot } from "react-loader-spinner";
import { useDispatch } from "react-redux";
import { changeTopic } from "../store/topicConfigSlice";
import GoogleAds from "./AdComponent.jsx"; 
import { useSelector } from "react-redux";
import { useThreeDots, useTopicChange } from "../Hooks";
import { errorMessages, parseTopic, parseCode } from "../Helpers/index.jsx";

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
  const [ entryErr, setEntryErr ] = useState(false); 
  const [ entering, setEntering ] = useState(false); 
  const [ resuming, setResuming ] = useState(false); 
  const [ tName, setTName ] = useState(null); 

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



  const handleClick = async (topicName) => { 
    setEntryErr(null); 
    try {
      setTName(topicName)
      setEntering(true); 
      const docRef = doc(db, "users", studentId, "classRoomState", topicName, );
      await setDoc(docRef,{ inClass: true, inSession: true}, { merge: true });
      navigate("/class", {
        state: { topicName, studentName },
      });
      localStorage.setItem(`LQN${topicName}`, 1)        
    } catch(e) {
      setEntryErr(
        !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."        
      )
    } finally {
        setEntering(false);
    }
  
  };

  const handleResume = async (topicName) => {
    setEntryErr(null); 
    try {
      setTName(topicName)
      setResuming(true); 
      const docRef = doc(db, "users", studentId, "classRoomState", topicName, );
      await setDoc(docRef,{ inClass: true, inSession: true}, { merge: true });    
      const bookmark = localStorage.getItem(`LQN${topicName}`)
      const LQN = bookmark ? JSON.parse(bookmark) : null
      
      navigate("/class", {
        state: { topicName, LQN, studentName },
      });
    } catch(e) {
      setEntryErr(
        !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."        
      )
    } finally {
        setResuming(false);      
    }  
  }

  

  return (
    <>
    <p className="centered">{entryErr}</p>
    <div className="center_piece">
      
      <h2 className="centered">Topics</h2>
    
      {topics.length === 0 ? 
        <p className="centered">No topics yet.
        </p>
      
      
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
              disabled={localStorage.getItem(`LQN${topic.id}`) || (entering && tName === topic.id)}
              className={
                showOptions.id === topic.id && showOptions.show
                  ? "action"
                  : "button"
              }
              onClick={() => handleClick(topic.id)}
            >
              {!subSnaps?.[index].empty ? (entering && tName === topic.id) ? "Entering...": "Redo" : entering ? 'Entering...' : "Enter Classroom"}
            </button>

            <button
            disabled={!localStorage.getItem(`LQN${topic.id}`) || (resuming && tName === topic.id)}
              className={
                showOptions.id === topic.id && showOptions.show
                  ? "action"
                  : "button"
              }
              onClick={() => handleResume(topic.id)}
            >
              { (resuming && tName === topic.id) ? 'Resuming' : 'Resume'}
            </button>            
          </div>
        </div>
      ))}
    </div>
    </>
  );
};


