$(async function() {
  // cache selectors 
  const $allStoriesList = $("#all-articles-list");
  const $filteredArticles = $("#filtered-articles");
  const $ownStories = $("#my-articles");
  const $favArticles = $('#favorited-articles');
  const $userProfile = $('#user-profile');

  const $submitForm = $("#submit-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");

  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $('#nav-submit');
  const $navFavorites = $('#nav-favorites');
  const $navStories = $('#nav-stories');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /*****************   Event Listeners  *****************/
  
  // Navigation to Homepage
  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });
  
  $navSubmit.on('click', function(){
    if (!currentUser) return;
    hideElements();
    $submitForm.show();
  });

  $submitForm.on('submit', async function(evt){
    evt.preventDefault();  // no page-refresh on submit

    if (!currentUser) return;
   
    const author = $('#author').val();
    const title = $('#title').val();
    const url = $('#url').val();

    const newStoryFormInfo = {author, title, url};

    const newStory = await storyList.addStory(currentUser, newStoryFormInfo);

    currentUser.ownStories.push(newStory.data.story);

    $submitForm.trigger("reset");

    $allStoriesList.append(newStory);
  });

  $navFavorites.on('click', async function(){
    if (!currentUser) return;

    hideElements();
    $favArticles.empty();
    
    let starClass = "star fas fa-star";
    for (let favStory of currentUser.favorites){
      const favHTML = generateStoryHTML(favStory, starClass);
      $favArticles.append(favHTML);
    }

    $favArticles.show();
  });

  $('.articles-container').on('click', '.star', async function handleStarClicks(evt){
    const favoriteId = $(evt.target).closest('li').attr('id');
    //  ".far fa-star" is regular, ".fas fa-star" is solid
    if ($(evt.target).attr('class') === "star far fa-star"){
      $(evt.target).attr('class', 'star fas fa-star');
      currentUser.addFavorite(currentUser, favoriteId, storyList);
    } else {
      $(evt.target).attr('class', 'star far fa-star');
      currentUser.removeFavorite(currentUser, favoriteId);
    }    
  });

  $navStories.on('click', function(){
    if (!currentUser) return;

    hideElements();
    $ownStories.empty();
    
    let starClass = 'star far fa-star';
    const trashCan = 'trash-can far fa-trash-alt';
    
    starClassForStories(currentUser.ownStories, starClass, $ownStories, trashCan);

    $ownStories.show();
  });

  $ownStories.on('click', '.trash-can', async function(evt){
    if (!currentUser) return;

    const deleteId = $(evt.target).closest('li').attr('id');
    storyList.deleteStory(currentUser, deleteId);

    for (let i = 0; i < currentUser.ownStories.length; i++){
      if (deleteId === currentUser.ownStories[i].storyId){
        currentUser.ownStories.splice(i, 1);
      }
    }
     
    $(evt.target).closest('li').remove();
  });

  $('#nav').on('click', '#nav-user-profile', function(){
    if (!currentUser) return;

    hideElements();
    
    $('#profile-name').append(currentUser.name);
    $('#profile-username').append(currentUser.username);
    $('#profile-account-date').append(currentUser.createdAt);

    $('#user-profile').show();
  });

  // Event listener for logging in
  //  If successfull, setup the user instance
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault();

    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);

    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();

    
  });

  // Event listener for signing up
  //  If successful, setup a new user instance
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault();

    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;

    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  $navLogOut.on("click", function() {
    $('#main-nav-links').hide();
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    // uses a sliding animation
    hideElements();
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
  });


  /*****************   Functions  *****************/
  
  function  starClassForStories(stories, starClass, domLocation, trashCan){
    for (let story of stories){
      if (!currentUser){
        const storyHTML = generateStoryHTML(story);
        domLocation.append(storyHTML);
      } else {
        for (let fav of currentUser.favorites){
          story.storyId === fav.storyId ? starClass = "star fas fa-star" : starClass;
        }
        const storyHTML = generateStoryHTML(story, starClass, trashCan);
        domLocation.append(storyHTML);
      }      
    }
  }

  // On page load, checks local storage to see if the user is already logged in.
  //  Renders page information accordingly.
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    // to get an instance of User with users favorite stories, stories user has posted, and users token
    // this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      $('#main-nav-links').show();
    }
  }

  function loginAndSubmitForm() {
    $loginForm.hide();
    $createAccountForm.hide();

    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    $allStoriesList.empty();
    let starClass = 'star far fa-star';
    starClassForStories(storyList.stories, starClass, $allStoriesList);

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  // call the StoryList.getStories static method which will generate a storyListInstance. Then render it.
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    let starClass = 'star far fa-star';
    starClassForStories(storyList.stories, starClass, $allStoriesList);
  }

  // A function to render HTML for an individual Story instance
  function generateStoryHTML(story, starClass, trashCan) {
    let hostName = getHostName(story.url);
    
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="${starClass}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <i class="${trashCan}"></i>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        
      </li>
    `);
    return storyMarkup;
  }

  //  hide all elements in elementsArr
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favArticles
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $('#nav-user-profile').show().text(currentUser.username);
  }

  // pull the hostname from a URL
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];   // if "://" get the text between the 2nd and 3rd "/"
    } else {
      hostName = url.split("/")[0];   // otherwise, get the text before the first "/"
    }
    if (hostName.slice(0, 4) === "www.") {  // take everything after www
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  // sync current user information to localStorage
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});

