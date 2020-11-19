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
  
  $navSubmit.on('click', async function(){
    if (!currentUser) return;
    hideElements();
    $submitForm.show();

    $allStoriesList.empty()
    await generateStories();
    $allStoriesList.show();
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
    await generateStories();

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
    
    const trashCan = 'trash-can far fa-trash-alt';
    starClassForStories(currentUser.ownStories, $ownStories, trashCan);

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

    for (let i = 0; i < currentUser.favorites.length; i++){
      if(deleteId === currentUser.favorites[i].storyId){
        currentUser.favorites.splice(i, 1);
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

  // Event listener for logging in. If successful, setup the user instance
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

  // Event listener for signing up. If successful, setup a new user instance
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
  
  function  starClassForStories(stories, domLocation, trashCan){
    for (let story of stories){
      if (!currentUser){
        const storyHTML = generateStoryHTML(story);
        domLocation.append(storyHTML);
      } 
      else {
        let starClass = 'star far fa-star';
        for (let fav of currentUser.favorites){
          story.storyId === fav.storyId ? starClass = "star fas fa-star" : starClass;
        }
        const storyHTML = generateStoryHTML(story, starClass, trashCan);
        domLocation.append(storyHTML);
      }      
    }
  }

  async function checkIfLoggedIn() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    // to get an instance of User with users favorite stories, stories user has posted, and users token
    // this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  function loginAndSubmitForm() {
    $loginForm.hide();
    $createAccountForm.hide();

    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    $allStoriesList.empty();
    
    starClassForStories(storyList.stories, $allStoriesList);

    $allStoriesList.show();
    $('#main-nav-links').show();

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

    // loop through all stories and generate HTML for them, adding appropriate star class as necessary
    starClassForStories(storyList.stories, $allStoriesList);
  }

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
    $('#main-nav-links').show();
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

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});

