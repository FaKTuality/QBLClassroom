import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../Firebase/index.js";
import { AuthContext } from "./authProvider";
import { useContext } from "react";

export const configureTopic = createAsyncThunk('users/topics', async ({tutorId, topicConfig}) => {
  const selectedStudents = topicConfig.students.filter((student)=> student.included )
  const finalTopicConfig = {
    topicName: topicConfig.topicName, 
    students: selectedStudents,
    createdAt: serverTimestamp(),
    deleteCount: 0
  }
  const docRef = doc(db, `admin/${tutorId}/topics/${topicConfig.topicName}`)
  await setDoc(docRef, finalTopicConfig)
})


const initialState = {
  savingConfiguration: null,
  savedConfiguration: null, 
  error: null,
  changedNames: {},
  changedTopics: {}, 
  hasAdFree: null, 
}
const topicConfig = createSlice({
  name: "topicConfig",

  initialState,
  
  reducers: {
    changeName: ( initialState, { payload: changedNamesPayload }) => {
      initialState.changedNames = changedNamesPayload
    }, 

    changeTopic: (initialState, { payload: changeTopicsPayload }) => {
      initialState.changedTopics = changeTopicsPayload
    }, 

    setAdFreeStatus: (initialState, { payload: adFreeStatus}) => {
      initialState.hasAdFree = adFreeStatus; 
    }
  },

  extraReducers: (builder) => {
    builder.addCase(configureTopic.pending, (state,) => {
      state.savingConfiguration = true; 
      state.savedConfiguration = false; 
    }); 
    builder.addCase(configureTopic.fulfilled, (state, action) => {
      state.savedConfiguration = true
      state.savingConfiguration = false; 
    })
    builder.addCase(configureTopic.rejected, (state, action) => {
      state.error = action.error.name; 
    })
  }
});

export default topicConfig.reducer;

export const { changeName, changeTopic, setAdFreeStatus } = topicConfig.actions