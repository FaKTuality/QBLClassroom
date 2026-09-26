import { Formik, Field, ErrorMessage, Form } from "formik";
import * as Yup from 'yup';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { configureTopic } from "../store/topicConfigSlice";
import { createPortal } from "react-dom";
import { useAuth } from "../store/authProvider";

export const AddTopicConfig = ({ setShowModal }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const topicSlice = useSelector((state) => state.topicConfig);
  const { currentUser: user } = useAuth();
  const tutorId = user?.uid;

  const validationSchema = Yup.object({
    topicName: Yup.string().required('please enter a topic'),
  });

  const closeModal = () => {
    setShowModal(false);
  };

  const onSubmit = async (values) => {
    await dispatch(configureTopic({ tutorId, topicConfig: values }));
    const questionState = {
      topicName: values.topicName, 
      isEditing: false,
    }
    navigate('/navtut/questionformTV', { state: questionState})    
  };

  return createPortal(
    <div onClick={closeModal} className="modal">
      <Formik
        initialValues={{ topicName: '' }}
        validateOnChange
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        <Form onClick={(e) => e.stopPropagation()} className="modal-content list relative">
          <h4 className="header-centered">Name your topic</h4>
          <div onClick={closeModal} className="close-modal">×</div>

          <div className="label-input-pair-vertical">
            <label htmlFor="topicName">Topic:</label>
            <Field
              className="textInput"
              name="topicName"
              id="topicName"
            />
          </div>
          <ErrorMessage
            name="topicName"
            component="div"
            className="error-message"
          />

          <button className="button button-centered" type="submit" disabled={topicSlice.savingConfiguration}>
            {topicSlice.savingConfiguration ? "Saving Configuration..." : "Save Configuration"}
          </button>

          {topicSlice.error && <div>{topicSlice.error}</div>}
        </Form>
      </Formik>
    </div>,
    document.getElementById('modal-root')
  );
};