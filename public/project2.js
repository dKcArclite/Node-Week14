$(document).ready(function () {
    $('#BooksList').DataTable({
        "createdRow": function (row, data, index) {
            if (data[4] > 0) {
                //$('td', row).eq(6).addClass('hide');
                var cell = $('td', row).eq(6);
                var btn = cell.find("#btnAdd");
                btn.addClass('hide');
            }
        }
    });

    var table = $('#BooksList').DataTable();

    $table2 = $('#BooksList').DataTable();

    $table2.on('click', 'button.add', function () {
        var closestRow = $(this).closest('tr');

        var data = $table2.row(closestRow).data();
        //var myRow = $table2.row(closestRow);
        //var cell = $('td', myRow).eq(6);
        //var btn = cell.find("#btnAdd");
        //btn.addClass('hide');
               
        var title = data[10];
        var author = data[2];
        var copyright = data[3];
        var isbn = data[7];
        var pages = data[8];
        var description = data[5].substring(0, 1000);
        //alert(description);

        var params = {
            title: title,
            author: author,
            copyright: copyright,
            isbn: isbn,
            pages: pages,
            description: description
        };

        $.post("/addBook", params, function (request, result) {
            window.location.reload();
            if (result && result.success) {
                //$("#status").text("Successfully logged in.");
                //alert("success");
                //window.location.reload(true);
            } else {
                //$("#status").text("Error logging in.");
                //alert("failure");
                //window.location.reload(true);
            }
        });


        //alert(data[0]);
    });

    $('#BooksList tbody').on('click', 'tr', function () {
        var data = table.row(this).data();
        $('#modal-title').val(data[10]);
        $('#modal-author').val(data[2]);
        $('#modal-copyright').val(data[3]);
        $('#modal-isbn').val(data[7]);
        $('#modal-pages').val(data[8]);
        $('#modal-description').text(data[5]);  
        $('#thumbnail').attr('src', data[9].replace(/&amp;/g, '&')); 
        $('#thumbnail').attr('alt', data[10]); 
        updateCount();
        //alert(2);
    });

    function updateCount() {
        var length = $('#modal-description').val().length;
        var length = 1000 - length;
        $('#chars').text(length);
    }

    //$('#ddlType').select2({
    //    //placeholder: "Select",
    //    //width: "100%"
    //});



});