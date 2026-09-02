import { useState } from "react"
import { useSelector } from "react-redux";


export const useThreeDots = () => {
  const [ showOptions, setShowOptions ] = useState({
    id: null,
    show: null,
  }); 
  const randomClick = () => {
    setShowOptions({
      id: null, 
      show: showOptions.show, 
    })
  }  

  const handleShowOptions = (id) => {
    setShowOptions({
      id: id, 
      show: showOptions.id === id || 
      showOptions.show === null ? !showOptions.show : showOptions.show
    })
  }  

  return {
    showOptions, 
    setShowOptions, 
    randomClick, 
    handleShowOptions,
  }


}

export const useNameChange = () => {
  const changedNames = useSelector((state) => state.topicConfig.changedNames)
  return changedNames

}


export const useTopicChange = () => {
  const changedTopics = useSelector((state) => state.topicConfig.changedTopics)
  return changedTopics
}

export const parseName = (name, studentId, changedNames) => {
  
  let displayName = name;
  for (let key in changedNames) {
    if(key === (studentId)) {
      displayName = changedNames[key]
    }
  }
  return displayName
}

export const parseTopic = (topicName, changedNames) => {
  
  let displayName = topicName;
  for (let key in changedNames) {
    if(key === (topicName)) {
      displayName = changedNames[key]
    }
  }
  return displayName
}


export const parseCode = (text) => {
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