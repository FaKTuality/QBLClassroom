import { useState } from "react"
import { useSelector } from "react-redux";
import React from "react";


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





export function usePasswordVisibility() {
  
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    showPassword,
    passwordType: showPassword ? "text" : "password",
    togglePasswordVisibility,
  };
}

export function usePasswordVisibility2() {
  const [showPassword2, setShowPassword2] = useState(false);

  const togglePasswordVisibility2 = () => {
    setShowPassword2((prev) => !prev);
  };

  return {
    showPassword2,
    passwordType2: showPassword2 ? "text" : "password",
    togglePasswordVisibility2,
  };
}

