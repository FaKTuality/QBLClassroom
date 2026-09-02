export const Notif = ({ operation, setShowNotif, questionNumber, account, studentName }) => {
  setTimeout(() => {
    setShowNotif(false);
  }, 2000);

  if (operation === "delete") {
    return (
      <div className="notif">
        Deletion successful!
      </div>
    );
  }

  if (operation === "submit-answers") {
    return (
      <div className="notif">
        Your answers have been submitted! Well done!
      </div>
    );
  }

  if (operation === "linkCopy") {
    return (
      <div className="notif">
        Copied to clipboard.
      </div>
    );
  }

  if (operation === "no-students") {
    return(
      <div className="notif-red">
        all your students have this topic.
      </div>      
    )
  }

    if (operation === "add-student") {
    return(
      <div className="notif">
        student added
      </div>      
    )
  }


  if (operation === "add-question") {
    return(
      <div className="notif">
        {`question ${questionNumber} added`}
      </div>      
    )
  }

  if (operation === "edit-question") {
    return(
      <div className="notif">
        {`question ${parseInt(questionNumber?.slice(8), 10)} edited`}
      </div>      
    )
  }

  if(operation === "link-account") {
    return(
      <div className="notif">
        {`${account} linked succesfully`}
      </div>
    )
  }

    if(operation === "unlink-account") {
    return(
      <div className="notif">
        {`${account} unlinked succesfully`}
      </div>
    )
  }
  
    if(operation === "change-password") {
    return(
      <div className="notif">
        password changed successfully
      </div>
    )
  }

    if(operation === "remove-student") {
    return(
      <div className="notif">
        {`${studentName} removed successfully`}
      </div>
    )
  }  

    if(operation === "change-name") {
    return(
      <div className="notif">
        {`${studentName}'s name changed successfully`}
      </div>
    )
  }    

    if(operation === "change-topic") {
    return(
      <div className="notif">
        {`topic name changed successfully`}
      </div>
    )
  }    

};