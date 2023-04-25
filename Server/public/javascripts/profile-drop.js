function userPopupShow() {
    var target = document.querySelector(`.user_popup`);
    if (target.style.display == "none" || target.style.display == "") {
        target.style.display = "block";
    } else {
        target.style.display = "none";
    }
}

function userPopupEditPwd() {
    var target = document.querySelector(`.user_popup_edit_password`);
    if (target.style.display == "none" || target.style.display == "") {
        target.style.display = "block";
    }
}

function userPopupEditPwdClose() {
    var target = (document.querySelector(
        `.user_popup_edit_password`
    ).style.display = "none");
}
