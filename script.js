/*******************************
  Firebase Initialization
*******************************/
const firebaseConfig = {
  apiKey: "AIzaSyDoKXJUEuiVCffhsR2tAYZQYMXTdyYiA3k",
  authDomain: "mystery-box-ab57d.firebaseapp.com",
  projectId: "mystery-box-ab57d",
  storageBucket: "mystery-box-ab57d.appspot.com",
  messagingSenderId: "975120416196",
  appId: "1:975120416196:web:98fefd48952b9ce86e3891"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUserUID = null;

/*******************************
  Auth State & Redirection
*******************************/
auth.onAuthStateChanged(user => {
  if(user){
    currentUserUID = user.uid;
    sessionStorage.setItem('uid', user.uid);

    // Redirect from login/signup to dashboard if logged in
    if(window.location.pathname.includes('index.html') || window.location.pathname.includes('signup.html')){
      window.location.href = 'dashboard.html';
    }
  } else {
    currentUserUID = null;
    sessionStorage.removeItem('uid');

    // Redirect to login if not logged in
    if(!window.location.pathname.includes('index.html') && !window.location.pathname.includes('signup.html')){
      window.location.href = 'index.html';
    }
  }
});

/*******************************
  LOGIN
*******************************/
const loginForm = document.getElementById('login-form');
if(loginForm){
  loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => alert(err.message));
  });
}

/*******************************
  SIGNUP
*******************************/
const signupForm = document.getElementById('signup-form');
if(signupForm){
  signupForm.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(()=> alert('Account created!'))
      .catch(err => alert(err.message));
  });
}

/*******************************
  LOGOUT
*******************************/
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn){
  logoutBtn.addEventListener('click', ()=> auth.signOut());
}

/*******************************
  COURSES CRUD
*******************************/
const courseForm = document.getElementById('course-form');
if(courseForm){
  const courseList = document.getElementById('course-list');

  // Fetch & display courses
  function fetchCourses(){
    db.collection('users').doc(currentUserUID).collection('courses').orderBy('createdAt')
      .onSnapshot(snapshot=>{
        courseList.innerHTML='';
        snapshot.forEach(doc=>{
          const c = doc.data();
          const div = document.createElement('div');
          div.className='card';
          div.textContent = c.name + ' - ' + c.lecturer;
          courseList.appendChild(div);
        });
      });
  }

  fetchCourses();

  // Add course
  courseForm.addEventListener('submit', e=>{
    e.preventDefault();
    const course = {
      name: document.getElementById('course-name').value,
      lecturer: document.getElementById('lecturer-name').value,
      color: document.getElementById('course-color').value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection('users').doc(currentUserUID).collection('courses').add(course);
    courseForm.reset();
  });
}

/*******************************
  TIMETABLE CRUD
*******************************/
const timetableForm = document.getElementById('timetable-form');
if(timetableForm){
  const timetableList = document.getElementById('timetable-list');
  const courseSelect = document.getElementById('course-select');

  // Fetch courses for select dropdown
  function fetchCoursesForSelect(){
    db.collection('users').doc(currentUserUID).collection('courses').get().then(snapshot=>{
      courseSelect.innerHTML='';
      snapshot.forEach(doc=>{
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().name;
        courseSelect.appendChild(opt);
      });
    });
  }
  fetchCoursesForSelect();

  // Add timetable entry
  timetableForm.addEventListener('submit', e=>{
    e.preventDefault();
    const entry = {
      courseId: courseSelect.value,
      day: document.getElementById('day-select').value,
      startTime: document.getElementById('start-time').value,
      endTime: document.getElementById('end-time').value,
      venue: document.getElementById('venue').value
    };
    db.collection('users').doc(currentUserUID).collection('timetable').add(entry);
    timetableForm.reset();
  });
}

/*******************************
  ASSIGNMENTS CRUD
*******************************/
const assignmentForm = document.getElementById('assignment-form');
if(assignmentForm){
  const assignmentCourseSelect = document.getElementById('assignment-course-select');
  const assignmentList = document.getElementById('assignment-list');

  // Fetch courses for assignment select
  function fetchCoursesForAssignment(){
    db.collection('users').doc(currentUserUID).collection('courses').get().then(snapshot=>{
      assignmentCourseSelect.innerHTML='';
      snapshot.forEach(doc=>{
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().name;
        assignmentCourseSelect.appendChild(opt);
      });
    });
  }
  fetchCoursesForAssignment();

  // Fetch & display assignments
  function fetchAssignments(){
    db.collection('users').doc(currentUserUID).collection('assignments')
      .onSnapshot(snapshot=>{
        assignmentList.innerHTML='';
        snapshot.forEach(doc=>{
          const a = doc.data();
          const courseName = assignmentCourseSelect.querySelector(`option[value="${a.courseId}"]`)?.textContent || '';
          const li = document.createElement('li');
          li.textContent = `${courseName}: ${a.title} (Due: ${a.dueDate})`;
          if(a.status==='completed') li.classList.add('completed');
          // Toggle status on click
          li.addEventListener('click', ()=>{
            db.collection('users').doc(currentUserUID).collection('assignments')
              .doc(doc.id).update({status:a.status==='completed'?'pending':'completed'});
          });
          assignmentList.appendChild(li);
        });
      });
  }
  fetchAssignments();

  // Add assignment
  assignmentForm.addEventListener('submit', e=>{
    e.preventDefault();
    const assignment = {
      courseId: assignmentCourseSelect.value,
      title: document.getElementById('assignment-title').value,
      dueDate: document.getElementById('assignment-due-date').value,
      status: 'pending'
    };
    db.collection('users').doc(currentUserUID).collection('assignments').add(assignment);
    assignmentForm.reset();
  });
}

/*******************************
  DASHBOARD: Today's classes
*******************************/
const todayClassesDiv = document.getElementById('today-classes');
if(todayClassesDiv){
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  db.collection('users').doc(currentUserUID).collection('timetable')
    .where('day','==',today)
    .orderBy('startTime')
    .onSnapshot(snapshot=>{
      todayClassesDiv.innerHTML='';
      snapshot.forEach(doc=>{
        const t = doc.data();
        const div = document.createElement('div');
        div.className='class-block';
        div.textContent = `${t.startTime} - ${t.endTime}: ${t.courseId} @ ${t.venue}`;
        todayClassesDiv.appendChild(div);
      });
    });
}




const todayClasses = document.getElementById('today-classes');
const nextClassCountdownDiv = document.getElementById('next-class-countdown');

if(todayClassesDiv){
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  db.collection('users').doc(currentUserUID).collection('timetable')
    .where('day','==',today)
    .orderBy('startTime')
    .onSnapshot(async snapshot => {
      todayClassesDiv.innerHTML = '';
      const classes = [];

      for(const doc of snapshot.docs){
        const t = doc.data();
        const courseDoc = await db.collection('users').doc(currentUserUID).collection('courses').doc(t.courseId).get();
        const course = courseDoc.data();

        const div = document.createElement('div');
        div.className = 'class-block';
        div.style.borderLeft = `6px solid ${course.color}`;
        div.textContent = `${t.startTime} - ${t.endTime}: ${course.name} @ ${t.venue}`;

        todayClassesDiv.appendChild(div);
        classes.push({startTime: t.startTime, courseName: course.name});
      }

      // Calculate next class countdown
      const now = new Date();
      let nextClass = null;

      for(const c of classes){
        const [hours, minutes] = c.startTime.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);

        if(classTime > now){
          nextClass = {time: classTime, courseName: c.courseName};
          break;
        }
      }

      if(nextClass){
        const updateCountdown = () => {
          const now = new Date();
          const diff = nextClass.time - now;
          if(diff <= 0){
            nextClassCountdownDiv.textContent = `Next class (${nextClass.courseName}) is starting now!`;
            clearInterval(interval);
            return;
          }
          const hrs = Math.floor(diff / (1000*60*60));
          const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
          const secs = Math.floor((diff % (1000*60)) / 1000);
          nextClassCountdownDiv.textContent = `Next class (${nextClass.courseName}) in ${hrs}h ${mins}m ${secs}s`;
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
      } else {
        nextClassCountdownDiv.textContent = 'No more classes today!';
      }
    });
}

