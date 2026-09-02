import { configureStore } from "@reduxjs/toolkit";
import topicConfigReducer from "./topicConfigSlice";

export const store = configureStore({
  reducer: {
    topicConfig: topicConfigReducer,
  },
});