
import { useState } from "react"

const Admin = () => { 
  let [questions, setQuestions ] = useState([])

  function handleAddQuestion () {
    setQuestions([...questions, {options: [{}, {}, {}, {}], id: Date.now()}])
  }

  function handleAddOption (id) {
    setQuestions(questions.map(question => {
      if(question.id === id) {
        return { ...question, options: [...question.options, {}]}
      }else{
        return question; 
      }
    }))
  }

  function handleRemoveQuestion (id) {
    setQuestions(questions.filter(question => question.id !== id))
  }

  function handleRemoveOption (id) {
    setQuestions(questions.map(question => {
      if(question.id === id) {
        return { ...question, options: question.options.slice(0, -1)}
      }else{
        return question; 
      }
    }))
  }

  return (
    <>
    <button onClick={handleAddQuestion}>Add question </button>
   
    {questions.map((question) => 
    <div key={question.id}>
      <textarea />
      <button onClick={() => handleAddOption(question.id)}>Add option </button>
      <button onClick={() => handleRemoveQuestion(question.id)}>remove question </button>
      <button onClick={() => handleRemoveOption(question.id)}>remove option</button>
      {question.options.map(() => <input key={question.id + Math.random()} />)}
    </div>
      
      
       )}
    
    </>
  )
}

export default Admin; 