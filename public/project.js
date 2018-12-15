$(document).ready(function () {
    //do not allow non numeric numbers to be entered
    $(".number-only").keydown(function (e) {
        // Allow: backspace, delete, tab, escape, enter and .
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
            // Allow: Ctrl+A, Command+A
            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
            // Allow: home, end, left, right, down, up
            (e.keyCode >= 35 && e.keyCode <= 40)) {
            // let it happen, don't do anything
            return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });

    /*Only allow letters to be entered. */
    $(document).on('keydown', '.letter-only', function (event) {
        var key = event.keyCode || event.charCode;
        /*Allow: backspace, delete, tab, escape, and enter*/
        if (key === 46 || key === 8 || key === 9 || key === 27 || key === 13 ||
            /*Allow: Ctrl+A*/
            (key === 65 && event.ctrlKey === true) ||
            /* Allow: home, end, left, right*/
            (key >= 35 && key <= 39) ||
            /* Allow shift key */
            (key === 16) ||
            /* Allow spacebar */
            key === 32) {
            /*let it happen, don't do anything*/
            return;
        } else {
            /*Ensure that it is a letter and stop the keypress*/
            if ((key < 65 || key > 90 || key === 192) && (key !== 222 && key !== 189 && key !== 173)) {
                event.preventDefault();
            }
            /* If the key is the apostrophe or dash, check for shift key, prevent if shift key is entered */
            if (event.shiftKey && (key === 222 || key === 189 || key === 173)) {
                event.preventDefault();
            }
        }
    });

    var maxLength = 1000;
    $('#modal-description').keyup(function () {
        var length = $(this).val().length;
        var length = maxLength - length;
        $('#chars').text(length);
    });

});