import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const Home = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [location]);

  
  return (
    <main className="home-page">

      {/* HERO */}
      <section className="home-hero" id="home">
        <div className="home-hero-content">
          <p className="home-eyebrow">QBL CLASSROOM</p>

          <h1>
            Learning that continues
            <span> beyond the classroom.</span>
          </h1>

          <p className="home-hero-description">
            QBL Classroom is designed for tutors who want to employ question-based learning in the 
            education of their learners. 
          </p>

          <div className="home-hero-actions">
            <a href="#features" className="button">
              Explore Features
            </a>

            <a href="/navauth/signup" className="button">
              Get Started
            </a>
          </div>
        </div>

        <div className="home-hero-card">
          <div className="home-hero-card-inner">
            <span className="home-card-label">QUESTION-BASED LEARNING</span>

            <h2>
              Prepare.
              <br />
              Organize.
              <br />
              Customize.
            </h2>

            <p>
              Prepare classes for your students to continue learning in your absence
            </p>
          </div>
        </div>
      </section>


      {/* FEATURES */}
      <section id="features" className="home-section home-features">
        <div className="home-section-heading">
          <p className="home-eyebrow">FEATURES</p>

          <h2>
            Built for
            <span> Tutors.</span>
          </h2>

          <p>
            QBL Classroom was built with input from experienced tutors on how they prepare lessons, manage students, and keep learning going in their absence.

          </p>
        </div>

        <div className="home-feature-grid">

          <article className="home-feature-card">
            <div className="home-feature-number">01</div>

            <h3>Tutor-Friendly Question Form</h3>

            <p>A convenient way to provide questions, options, 
              and tailored feedback in a variety of formats.

            </p>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-number">02</div>

            <h3>Multi-level Topic & Question Management</h3>
            <p>
              Tutors can manage topics and questions at a student-level as well as a class-level; 
              Tutors can create, edit, and delete topics and questions in a topic for <strong>ALL</strong> their students 
              or for <strong>ANY</strong> selection 
              of their students.               
            </p>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-number">03</div>

            <h3>Question Shuffling</h3>

            <p>
              Tutors can choose to shuffle the order of their questions in a topic and
              have their students retake the class, fostering genuine learning

            </p>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-number">04</div>

            <h3>Individual Classroom</h3>

            <p>
              Students access their assigned topics and questions in one place, 
              respond to each question, receive the feedback provided by their tutor, and submit responses.
            </p>
          </article>

          <article className="home-feature-card">
            <div className="home-feature-number">05</div>

            <h3>Controlled Access for New Students </h3>

            <p>
              New students only gain access to topics their tutor explicitly 
              assigns to them, rather than automatically receiving access to existing class topics.
            </p>
          </article>          
          
          <article className="home-feature-card">
            <div className="home-feature-number">06</div>

            <h3>Rename Anytime</h3>

            <p>
              Rename students and topics at any time to suit the way you organize your classroom.
            </p>
          </article>          
                    

        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="home-section home-process">
        <div className="home-section-heading">
          <p className="home-eyebrow">HOW IT WORKS</p>

          <h2>
            A simple learning
            <span> cycle.</span>
          </h2>
        </div>

        <div className="home-process-grid">

          <div className="home-process-step">
            <span>1</span>
            <h3>Tutor prepares</h3>
            <p>
              Questions and feedback are provided for each topic
            </p>
          </div>

          <div className="home-process-line"></div>

          <div className="home-process-step">
            <span>2</span>
            <h3>Student Responds</h3>
            <p>
              Students work through questions and submit their responses
            </p>
          </div>

          <div className="home-process-line"></div>

          <div className="home-process-step">
            <span>3</span>
            <h3>Tutor reviews</h3>
            <p>
              Tutor reviews students' submissions. 
            </p>
          </div>

        </div>
      </section>


      {/* PRICING */}
      <section id="pricing" className="home-section home-pricing">
        <div className="home-section-heading">
          <p className="home-eyebrow">PRICING</p>

          <h2>
            QBL Classroom is
            <span> Free.</span>
          </h2>

          <p>
            QBL Classroom is designed to foster genuine learning via question-based learning
          </p>
        </div>

        <div className="home-price-card">

          <div>
            <p className="home-price-label">QBL CLASSROOM</p>

            <h3>Free to get started</h3>

            <p>
              Prepare your topics and questions, and
              invite your students to learn in your absence.
            </p>
          </div>

          <a href="/navauth/signup" className="button">
            Create an Account
          </a>

        </div>
      </section>


      {/* FAQ */}
      <section id="faqs" className="home-section home-faq">
        <div className="home-section-heading">
          <p className="home-eyebrow">FAQs</p>

          <h2>
            Frequently asked
            <span> questions.</span>
          </h2>
        </div>

        <div className="home-faq-list">

          <details>
            <summary>Who is QBL Classroom for?</summary>
            <p>
              QBL Classroom is designed primarily for tutors who want to
              prepare structured, question-based learning experiences for
              their students.
            </p>
          </details>

          <details>
            <summary>Can students learn without the tutor being present?</summary>
            <p>
              Yes. Tutors can prepare the topics and questions
              beforehand so students can work through the class independently.
            </p>
          </details>

          <details>
            <summary>Can questions be adapted for individual students?</summary>
            <p>
              Yes. Tutors can create student-specific versions of topics and
              questions when a student needs a different approach.
            </p>
          </details>

          <details>
            <summary>What kinds of feedback can tutors provide?</summary>
            <p>
              Tutors can provide feedback in any of the following formats: text, video, audio, and image
            </p>
          </details>

        </div>
      </section>


      {/* FINAL CTA */}
      <section className="home-final-cta">
        <p className="home-eyebrow">READY TO BEGIN?</p>

        <h2>
          Turn questions into
          <span> learning.</span>
        </h2>

        <p>
          Set up your QBL Classroom and start building your first lesson.
        </p>

        <a href="/navauth/signup" className="button">
          Get Started
        </a>
      </section>

    </main>
  );
};