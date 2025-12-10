////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 10;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;
const timeoutDelay = 30; // 30 secondes pour tests

let categories = [];
let selectedCategory = "";
let currentETag = "";
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;
let authenticatedUser = false;
let currentUser = null;
let unauthenticatedId = null;

Init_UI();
async function Init_UI() {
    const storedUser = Users_API.RetrieveLoggedUser();
    if (storedUser) {
        authenticatedUser = storedUser.VerifyCode == "verified";
        currentUser = storedUser;
    }

    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toggleShowKeywords();
        showPosts();
    });

    if (!authenticatedUser && currentUser != null){
        showVerificationForm();
    }
    else {
        installKeywordsOnkeyupEvent();
        await showPosts();
        start_Periodic_Refresh();
    }

    /* determine if elem is in viewport */
    $.fn.isInViewport = function () { /* insert a new method to jquery sizzle */
        var elementTop = $(this).offset().top;
        var elementBottom = elementTop + $(this).outerHeight();

        var viewportTop = $(window).scrollTop();
        var viewportBottom = viewportTop + $(window).height();

        return elementBottom > viewportTop && elementTop < viewportBottom;
    };
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {
    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        /* Delay search by keywordsOnchangeDelay seconds in order to limit requests to server */
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#showSearch").show();
    if (showKeywords)
        $("#searchKeys").show();
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toggleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    $("#createPost").show();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    $("#createPost").show();

    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);

    // Restart timeout countdown
    if (authenticatedUser) {
        timeout();
    }
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    noTimeout();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    noTimeout();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showError(message, details = "") {
    periodic_Refresh_paused = true;
    popupMessage(message);
}
function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout");
    renderPostForm();
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

///////////////////////////// Authentication & user forms //////////////////////////////////////

function showLoginForm(message = "") {
    hidePosts();
    $("#viewTitle").text("Connexion");
    $("#form").show().empty();

    $('#commit').hide();  // On enlève commit
    $('#abort').show();   // Abort reste fonctionnel

    renderLoginForm(message);
}
function showRegisterForm() {
    // showUserForm("Inscription", "register");
    renderCreateProfil();
}
function showEditProfileForm() {
    hidePosts();
    renderEditProfil();
    $("#form").show();
    $("#commit").hide();
    $("#abort").show();
}
function showVerificationForm() {
    hidePosts();
    renderVerificationForm();
    $("#form").show();
    $("#commit").hide();
    $("#abort").show();
}

function renderLoginForm(message = "") {

    $("#form").empty();

    $("#form").append(`
        <form id="loginForm" class="loginform">
         ${message ? `<div id="loginMessage" style="color:red; margin-bottom:10px;">${message}</div>` : ''}
            
            <label for="Email">Courriel :</label>
            <input class="form-control" type="email" id="Email" name="Email" required>

            <label for="Password">Mot de passe :</label>
            <input class="form-control" type="password" id="Password" name="Password" required>

            <div class="mt-3 d-flex flex-column gap-2">
                <button type="submit" class="btn btn-primary">Entrer</button>
                <button type="button" class="btn btn-secondary" id="btnRegister">Nouveau compte</button>
            </div>
        </form>
    `);

    // Bouton Entrer
    $("#loginForm").on("submit", async function (e) {
        e.preventDefault();

        const credentials = getFormData($("#loginForm"));

        const result = await Users_API.Login(credentials);

        if (!Users_API.error && result) {
            currentUser = result.User;
            authenticatedUser = currentUser.VerifyCode == "verified";

            if (authenticatedUser){
                updateDropDownMenu();
                await showPosts(true);

                console.log("Login successful, starting timeout timer");
                initTimeout(timeoutDelay, async () => {
                    await Users_API.Logout(currentUser);
                    authenticatedUser = false;
                    currentUser = null;
                    updateDropDownMenu();
                    showLoginForm("Votre session est expirée. Veuillez vous reconnecter.");
                });
                timeout();
            }
            else {
                renderVerificationForm();
            }
        } else {
            showError(Users_API.currentHttpError || "Identifiants invalides");
        }
    });

    // Nouveau compte
    $("#btnRegister").on("click", () => showRegisterForm());

    // Abort → retour au fil
    $('#abort').off().on("click", async () => showPosts(true));
}

function renderVerificationForm(message = "") {

    $("#form").empty();

    $("#form").append(`
        <form id="verifForm" class="loginform">
         ${message ? `<div id="loginMessage" style="color:red; margin-bottom:10px;">${message}</div>` 
         : ''}

            <div id="msg" style="margin-bottom:10px; font-weight:bold;">Veullez entrer le code de vérification que vous avez reçu par courriel</div>
            <input id="Id" name="Id" value="${currentUser.Id}" hidden>
            <input class="form-control" type="text" id="VerifyCode" name="VerifyCode" required placeholder="Code de vérification courriel">
            <div class="mt-3 d-flex flex-column gap-2">
                <button type="submit" class="btn btn-primary">Vérifier</button>
            </div>
        </form>
    `);

    // Bouton Entrer
    $("#verifForm").on("submit", async function (e) {
        e.preventDefault();

        const verifyInfo = getFormData($("#verifForm"));

        const result = await Users_API.Verify(verifyInfo);

        if (!Users_API.error && result) {
            authenticatedUser = true;
            currentUser = result.User;
            updateDropDownMenu();
            await showPosts(true);

            console.log("Login successful, starting timeout timer");
            initTimeout(timeoutDelay, async () => {
                await Users_API.Logout(currentUser);
                // authenticatedUser = false;
                currentUser = null;
                updateDropDownMenu();
                showLoginForm("Votre session est expirée. Veuillez vous reconnecter.");
            });
            timeout();
        } else {
            showError(Users_API.currentHttpError || "Identifiants invalides");
        }
    });

    // Nouveau compte
    $("#btnRegister").on("click", () => showRegisterForm());

    // Abort → retour au fil
    $('#abort').off().on("click", async () => {Users_API.Logout(currentUser); showPosts(true); });
}

function renderCreateProfil() {
    $("#viewTitle").text("Inscription");
    noTimeout();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="updateProfilForm"'>
            <fieldset>
                <legend>Adresse ce courriel</legend>
                <input  type="email"
                        class="form-control Email"
                        name="Email"
                        id="Email"
                        placeholder="Courriel"
                        required
                        RequireMessage = 'Veuillez entrer votre courriel'
                        InvalidMessage = 'Courriel invalide'
                        CustomErrorMessage ="Ce courriel est déjà utilisé"/>
                <input  class="form-control MatchedInput"
                        type="text"
                        matchedInputId="Email"
                        name="matchedEmail"
                        id="matchedEmail"
                        placeholder="Vérification"
                        required
                        RequireMessage = 'Veuillez entrez de nouveau votre courriel'
                        InvalidMessage="Les courriels ne correspondent pas" />
            </fieldset>
            <fieldset>
                <legend>Mot de passe</legend>
                <input  type="password"
                        class="form-control"
                        name="Password"
                        id="Password"
                        placeholder="Mot de passe"
                        required
                        RequireMessage = 'Veuillez entrer un mot de passe'
                        InvalidMessage = 'Mot de passe trop court'/>
                <input  class="form-control MatchedInput"
                        type="password"
                        matchedInputId="Password"
                        name="matchedPassword"
                        id="matchedPassword"
                        placeholder="Vérification" required
                        InvalidMessage="Ne correspond pas au mot de passe" />
            </fieldset>
            <fieldset>
                <legend>Nom</legend>
                <input  type="text"
                        class="form-control Alpha"
                        name="Name"
                        id="Name"
                        placeholder="Nom"
                        required
                        RequireMessage = 'Veuillez entrer votre nom'
                        InvalidMessage = 'Nom invalide'/>
            </fieldset>
            <fieldset>
                <legend>Avatar</legend>
                <div class='imageUploader'
                        newImage='true'
                        controlId='Avatar'
                        imageSrc='no-avatar.png'
                        waitingImage="images/Loading_icon.gif">
            </div>
            </fieldset>
   
            <input type='submit' name='submit' id='saveUser' value="Enregistrer" class="form-control btn-primary formButton">
        </form>
        <div class="cancel">
            <button class="form-control btn-secondary formButton" id="abortCreateProfilCmd">Annuler</button>
        </div>
    `);
    $('#loginCmd').on('click', renderLoginForm);
    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
    $('#abortCreateProfilCmd').on('click', renderLoginForm);
    addConflictValidation(Users_API.checkConflictURL(), 'Email' /* field unicity check */, 'saveUser' /* form submit button Id */);
    $('#createProfilForm').on("submit", function (event) {
        let profil = getFormData($('#createProfilForm'));
        delete profil.matchedPassword;
        delete profil.matchedEmail;
        event.preventDefault();
        createProfil(profil);
    });
}
function renderEditProfil() {
    $("#viewTitle").text("Modification");
    noTimeout();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="updateProfilForm"'>
            <input hidden id="Id" name="Id" value="${currentUser.Id}">
            <fieldset>
                <legend>Adresse ce courriel</legend>
                <input  type="email"
                        class="form-control Email"
                        name="Email"
                        id="Email"
                        value=${currentUser.Email}
                        placeholder="Courriel"
                        required
                        RequireMessage = 'Veuillez entrer votre courriel'
                        InvalidMessage = 'Courriel invalide'
                        CustomErrorMessage ="Ce courriel est déjà utilisé"/>
                <input  class="form-control MatchedInput"
                        type="text"
                        matchedInputId="Email"
                        name="matchedEmail"
                        id="matchedEmail"
                        value=${currentUser.Email}
                        placeholder="Vérification"
                        required
                        RequireMessage = 'Veuillez entrez de nouveau votre courriel'
                        InvalidMessage="Les courriels ne correspondent pas" />
            </fieldset>
            <fieldset>
                <legend>Mot de passe</legend>
                <input  type="password"
                        class="form-control"
                        name="Password"
                        id="Password"
                        placeholder="Mot de passe"
                        value=""
                        InvalidMessage = 'Mot de passe trop court'/>
                <input  class="form-control MatchedInput"
                        type="password"
                        matchedInputId="Password"
                        name="matchedPassword"
                        id="matchedPassword"
                        placeholder="Vérification"
                        value=""
                        InvalidMessage="Ne correspond pas au mot de passe" />
            </fieldset>
            <fieldset>
                <legend>Nom</legend>
                <input  type="text"
                        class="form-control Alpha"
                        name="Name"
                        id="Name"
                        value=${currentUser.Name}
                        placeholder="Nom"
                        required
                        RequireMessage = 'Veuillez entrer votre nom'
                        InvalidMessage = 'Nom invalide'/>
            </fieldset>
            <fieldset>
                <legend>Avatar</legend>
                <div class='imageUploader'
                        newImage='false'
                        controlId='Avatar'
                        imageSrc='${currentUser.Avatar}'
                        waitingImage="images/Loading_icon.gif">
            </div>
            </fieldset>
   
            <input type='submit' name='submit' id='saveUser' value="Enregistrer" class="form-control btn-primary formButton">
        </form>
        <div class="cancel">
            <button class="form-control btn-secondary formButton" id="abortUpdateProfilCmd">Annuler</button>
        </div>
    `);
    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
    $('#abortUpdateProfilCmd').on('click', async function () {await showPosts(true)});
    addConflictValidation(Users_API.checkConflictURL(), 'Email' /* field unicity check */, 'saveUser' /* form submit button Id */);
    $('#updateProfilForm').on("submit", function (event) {
        let profil = getFormData($('#updateProfilForm'));
        delete profil.matchedPassword;
        delete profil.matchedEmail;
        profil.Id = currentUser.Id;
        
        event.preventDefault();
        updateProfil(profil);
    });
}

async function createProfil(profil) {
    result = await Users_API.Register(profil);

    if (!Users_API.error && result) {
            authenticatedUser = false;
            currentUser = result.User; // AccountsController renvoie le nouvel utilisateur ou modifié
            updateDropDownMenu();
            await showPosts(true);
        } else {
            showError(Users_API.currentHttpError || "Impossible d'enregistrer l'utilisateur");
        }
}

async function updateProfil(profil) {
    result = await Users_API.Update(profil);

    if (!Users_API.error && result) {
            authenticatedUser = result.VerifyCode == "verified";
            currentUser = result; // AccountsController renvoie le nouvel utilisateur ou modifié
                updateDropDownMenu();
            
            if (authenticatedUser)
            {
                await showPosts(true);
            }
            else {
                showVerificationForm();
            }
        } else {
            showError(Users_API.currentHttpError || "Impossible d'enregistrer l'utilisateur");
        }
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {

    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            updateVisiblePosts();
            let etag = await Posts_API.HEAD();
            if (currentETag != etag)
                currentETag = etag;
        }
    },
        periodicRefreshPeriod * 1000);
}
function updateVisiblePosts() {
    $('.post').each(async function () {
        if ($(this).isInViewport()) {
            updatePost($(this).attr('id'));
        }
    })
    compileCategories();
}
async function updatePost(postId) {
    let postElem = $(`.post[id=${postId}]`);
    let response = await Posts_API.Get(postId);
    if (!Posts_API.error) {
        let post = response.data;
        let wasExtended = $(`.postTextContainer[postid=${postId}]`).hasClass("showExtra");
        postElem.replaceWith(renderPost(post));
        if (wasExtended) {
            $(`.postTextContainer[postid=${postId}]`).addClass('showExtra');
            $(`.postTextContainer[postid=${postId}]`).removeClass('hideExtra');
            $(`.moreText[postid=${postId}]`).hide();
            $(`.lessText[postid=${postId}]`).show();
        }
    }
    linefeeds_to_Html_br(".postText");
    highlightKeywords();
    attach_Posts_UI_Events_Callback();
}
async function renderPosts(container, queryString) {
    addWaitingGif();
    let loggedUser = Users_API.RetrieveLoggedUser();

    let endOfData = false;
    queryString += "&sort=-date";
    if (!loggedUser)
        $("#createPost").hide();
    
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    let response = await Posts_API.GetQuery(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let Posts = response.data;
        if (Posts.length > 0) {
            Posts.forEach(Post => {
                container.append(renderPost(Post));
            });
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(post) {
    let loggedUser = Users_API.RetrieveLoggedUser();
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let crudIcons = "";
    let faClass = "fa-regular";
    let likers = "";
    let loggedUserLiked = false;
    
    //vérifier id et name pour les likes
    //Faire la liste des users qui ont liké le post en regardant leurs id et noms, extraire le nom
    // Vérifier si l'usager est connecté
    if (loggedUser) {
        // Si connecté, faire la liste des likers
        // Vérifier si l'usager connecté a liké le post
        post.Likes.forEach(user => {
            likers += user.Name + "\n";
            if (user.Name === loggedUser.Name && user.Id === loggedUser.Id) {
                loggedUserLiked = true;
                faClass = "fa-solid";
            }
        });
    
        // Puisque connecté, vérifier les cruds icônes à afficher
        // Si le post.OwnerId est le même que l'usager connecté, on peut éditer/supprimer
        // Si l'usager est admin ou super admin, on peut aussi éditer/supprimer
        // Dans tous les cas, si l'usager est connecté, il peut liker, donc
        // Afficher l'icône de like et le nombre de likes à côté. hover sur le nombre, affiche la liste des likers
        if (post.OwnerId === loggedUser.Id || (loggedUser && (loggedUser.isAdmin || loggedUser.isSuper))) {
            crudIcons += `<span postId='${post.Id}' class='editCmd cmdIconXSmall fa fa-pencil' title='Modifier le post'></span>`;
            crudIcons += `<span postId='${post.Id}' class='deleteCmd cmdIconXSmall fa fa-trash' title='Supprimer le post'></span>`;
        }
        crudIcons += `<span postId='${post.Id}' class='likeCmd cmdIconXSmall ${faClass} fa-thumbs-up' title='Aimer le post'></span>
            <span postId='${post.Id}' class='likeCount' title='${likers.trim()}'>${post.Likes.length}</span>`;
    }

    // afficher à gauche de la date, l'avatar du propriétaire du post et son nom à côté
    return $(`
        <div class="post" id="${post.Id}" etag="${currentETag}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcons}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postOwnerAndDate">
                <div class="ownerLayout">
                    <img class="UserAvatarXSmall" src='${post.OwnerAvatar}' alt="Avatar de ${post.OwnerName}" />
                    <span class="postOwnerName">${post.OwnerName}</span>
                </div>
                <div class="postDate"> ${date} </div>
            </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
           
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}
async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    let authLabel = authenticatedUser ? "Déconnexion" : "Connexion";
    let authIcon = authenticatedUser 
        ? "fa-solid fa-arrow-right-from-bracket" 
        : "fa-solid fa-arrow-right-to-bracket";
    let editLabel = "Modifier votre profil";
    let editIcon = "fa-solid fa-user-pen";

    DDMenu.empty();
    if (authenticatedUser) {
        if(currentUser && currentUser.isAdmin){
            DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="adminCmd">
                <i class="fa-solid fa-users-gear"></i> Gestion des usagers
            </div>
            `));
        }
        DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="editCmd">
            <i class="menuIcon ${editIcon} mx-2"></i> ${editLabel}
        </div>
        `));
    }
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="authCmd">
            <i class="menuIcon ${authIcon} mx-2"></i> ${authLabel}
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <!--<div style="display:grid; grid-template-columns:70px auto;  align-items: center;">
                <img src="news-logo-upload.png" class="appLogo" alt="" title="Fil de nouvelles">
                <span>À propos...</span>
            </div>-->
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#adminCmd').on("click", function () {
        showUserManagement();
    });
    $('#authCmd').on("click", async function () {
        if (authenticatedUser) {
            await Users_API.Logout(currentUser);
            authenticatedUser = false;
            currentUser = null;
            await showPosts(true);
            updateDropDownMenu();
        } else {
            showLoginForm();
        }
    });
    $('#editCmd').on("click", function () {
        showEditProfileForm();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");

    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        //$(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        //$(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
    $(".likeCmd").off();
    $(".likeCmd").on("click", async function () {
        let postId = $(this).attr("postId");
        let loggedUser = Users_API.RetrieveLoggedUser();
        if (loggedUser) {
            let response = await Posts_API.ToggleLike(postId, loggedUser.Id);
            if (!Posts_API.error) {
                updatePost(postId);
            } else {
                showError(Posts_API.currentHttpError);
            }
        } else {
            showError("Vous devez être connecté pour aimer un post.");
        }
    });
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    showError(Posts_API.currentHttpError);
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function renderPostForm(post = null) {
    noTimeout();
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError(Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
async function renderError(message) {
    await Posts_API.logout();
    updateDropDownMenu();
    switch (Posts_API.currentStatus) {
        case 401:
        case 403:
        case 405:
            message = "Accès refusé...Expiration de votre session. Veuillez vous reconnecter.";

            renderLoginForm();
            break;
        case 404: message = "Ressource introuvable..."; break;
        case 409: message = "Ressource conflictuelle..."; break;
        default: if (!message) message = "Un problème est survenu...";
    }

    $("#form").empty();
    $("#form").append(
        $(`
             <fieldset>
                <legend><b>Une erreur est survenue</b></legend>
                <div class="errorContainer">
                    ${message}
                </div>
                <hr>
                <div class="form">
                    <button id="connectCmd" class="form-control btn-primary">Connexion</button>
                </div>
            </fieldset>
        `)
    );
}

function showUserManagement() {
    noTimeout();

    hidePosts();
    $('#form').hide();
    $('#commit').hide();
    $('#abort').hide();
    $("#createPost").hide();
    $("#viewTitle").text("Gestion des usagers");

    renderUserManagementPanel();
}


// Pris de Contacts et changé noms variables still gotta work on it
async function renderUsers() {
    showWaitingGif();
    $("#actionTitle").text("Liste des usagers");
    $("#createUser").show();
    $("#abort").hide();
    let users = await API_GetUsers();
    eraseContent();
    if (users !== null) {
        users.forEach(user => {
            $("#content").append(renderUser(user));
        });
        restoreContentScrollPosition();
        // Attached click events on command icons
        $(".editCmd").on("click", function () {
            saveContentScrollPosition();
            renderEditUserForm($(this).attr("editUserId"));
        });
        $(".deleteCmd").on("click", function () {
            saveContentScrollPosition();
            renderDeleteUserForm($(this).attr("deleteUserId"));
        });
        $(".userRow").on("click", function (e) { e.preventDefault(); })
    } else {
        renderError("Service introuvable");
    }
}

function renderUser(user) {
    return $(`
     <div class="userRow" user_id=${user.Id}">
        <div class="userContainer noselect">
            <div class="userLayout">
                 <div class="avatar" style="background-image:url('${user.Avatar}')"></div>
                 <div class="userInfo">
                    <span class="userName">${user.Name}</span>
                    <span class="userPhone">${user.Phone}</span>
                    <a href="mailto:${user.Email}" class="userEmail" target="_blank" >${user.Email}</a>
                </div>
            </div>
            <div class="userCommandPanel">
                <span class="editCmd cmdIcon fa fa-pencil" editUserId="${user.Id}" title="Modifier ${user.Name}"></span>
                <span class="deleteCmd cmdIcon fa fa-trash" deleteUserId="${user.Id}" title="Effacer ${user.Name}"></span>
            </div>
        </div>
    </div>           
    `);
}