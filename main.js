
$(document).ready(function() {

	// Get the modal
	const modal = document.getElementById('factoryModal');

	//Add Socket IO
	const socket = io();

	// Get the button that opens the modal
	const btnOpenFactoryModal = document.getElementById("btnCreateFactory");

	//image button for creating a new factory
	const btnSubmitFactory = document.getElementById("btnSubmitFactory");

	// Get the <span> element that closes the modal
	const span = document.getElementsByClassName("factoryModalSpanClose")[0];

	// When the user clicks the button, open the modal 
	btnOpenFactoryModal.onclick = function() {
		//display modal
	    modal.style.display = "block";

	    //set default values
    	$("#txtFactoryName").val('');
		$("#txtUpperBound").val('');
		$("#txtLowerBound").val('');
		$("#txtNumberOfChildren").val('1');

		//"0" is used for newly created factories
		$("#txtHiddenId").val('0');

		//make sure to update the add button's text on when creating new factories
		$("#btnSubmitFactory").html('Add');

		//focus on the first textbox to assist with immediate typing
		$("#txtFactoryName").focus();
	}
	//capture the values from the controls to pass to the database
	btnSubmitFactory.onclick = function() {
		if (Validator()) {
			socket.emit('set', {
				"id": $("#txtHiddenId").val(),
				"name": $("#txtFactoryName").val(),
				"upper" : $("#txtUpperBound").val(),
				"lower" : $("#txtLowerBound").val(),
				"count" : $("#txtNumberOfChildren").val()
			});

			//close modal
			modal.style.display = "none";
		}
	}
	//cancel button closes modal
	btnCancelFactory.onclick = function() {
		modal.style.display = "none";
	}

	//keypress watch for numeric only
	$("#txtLowerBound").keypress(function(event) {
		return isNumberKey(event);
	});

	//keypress watch for numeric only
	$("#txtUpperBound").keypress(function(event) {
		return isNumberKey(event);
	});

	//user can press escape key to exit the factory modal
	window.onkeydown = function(event) {
		if(event.keyCode == 27) {
			modal.style.display = "none";
		}
	};

	//populate the modal with the edit-info
	socket.on('populateModal', function(rows) {

		modal.style.display = "block";

		for (i in rows) {
			$("#txtHiddenId").val(rows[i].id);
			$("#txtFactoryName").val(rows[i].name);
			$("#txtLowerBound").val(rows[i].lower);
			$("#txtUpperBound").val(rows[i].upper);
			$("#txtNumberOfChildren").val(rows[i].count);
			$("#txtFactoryName").focus();
		}

		$("#btnSubmitFactory").html('Update');	
	});

	//display error message from back-end validation
	socket.on('errorMessage', function(message) {
		$.iaoAlert({ msg: message, type: "warning", mode: "dark" });
		modal.style.display = "block";
	});

	//display MySQL connection error message from back-end validation
	socket.on('errorMessageForSQL', function(message) {
		$.iaoAlert({ msg: message, type: "error", mode: "dark" });
	});

	//Create the tree based off of the info in the database.
	socket.on('get', function (rows) {
		
		//empty tree of contents before re-populating
		$("#tree").empty();

		//begin appending the new data
		$("#tree").append(
			'<tr class="treegrid-0">' + 
				'<td colspan="2" style="font-weight:bold">Root</td>' +
			'</tr>');

		//loop through data and finish creating the tree
		for(i in rows) {

			$("#tree").append(
				'<tr class="treegrid-'+ rows[i].id + ' parent treegrid-parent-0" id="' + rows[i].id + '">' + 
					'<td style="width:400px;font-weight:bold">' + htmlEncode(rows[i].name) + '</td>' + 
					'<td style="font-weight:bold;"><span class="factoryRanges">' + rows[i].lower + ':'  + rows[i].upper + '</span></td>' + 
				'</tr>');

			//create children array to append data to the tree.
			var childrenArray = GetChildrenNodes(rows[i].children);

			for (c in childrenArray) {

				$("#tree").append(
					'<tr class="treegrid-0-0 child treegrid-parent-'+ rows[i].id + '">' + 
						'<td colspan="2">' + childrenArray[c] + '</td>' +
					'</tr>');
			}
		}

		//saves the state of the tree
		$('.tree').treegrid({
          'initialState': 'collapsed',
          'saveState': true,
        });
	});

	// When the user clicks on <span> (x), close the modal
	factoryModalClose.onclick = function() {
	    modal.style.display = "none";
	}

	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
	    if (event.target == modal) {
	        modal.style.display = "none";
	    }
	}

	//on right-click, populate context menu for Edit or Delete functionality
    $.contextMenu({
        selector: '.treegrid-parent-0', 
        callback: function(key, options) {

       		if(key == "delete") 
           		socket.emit('deleteID',options.$trigger[0].id);
           
	   		if (key == "edit") 
  		   		socket.emit('populateModalWithID',options.$trigger[0].id);
  		   
        },
        items: {
            "edit": {name: "Edit", icon: "edit"},
            "delete": {name: "Delete", icon: "delete"}
        }
    });

	//put children nodes into an array
	function GetChildrenNodes(children) {
		return children.split(',')
	}

	//display encoded html
	function htmlEncode(value) {
    	return $('<div/>').text(value).html();
	}

	//only allow numbers to be keyed into the input box.
	function isNumberKey(evt)
  	{
		var charCode = (evt.which) ? evt.which : event.keyCode;
		if (charCode > 31 && (charCode < 48 || charCode > 57 || charCode == 46))
			return false;

		return true;
  	}

    //validate the user inputs
    function Validator() {
    	if($("#txtFactoryName").val() == '') {
    		$.iaoAlert({ msg: "Factory Name cannot be blank!", type: "warning", mode: "dark" });
    		$("#txtFactoryName").focus();
    		return false;
    	}

    	if($("#txtFactoryName").val().length > 255) { 
    		$.iaoAlert({ msg: "Factory Name needs to be less than 256 characters!", type: "warning", mode: "dark" });
    		$("#txtFactoryName").focus();
    		return false;
    	}

    	if($("#txtLowerBound").val() == '') {
			$.iaoAlert({ msg: "LowerBound cannot be blank!", type: "warning", mode: "dark" });
    		$("#txtLowerBound").focus();
			return false;
		}

		if($("#txtLowerBound").val() != $("#txtLowerBound").val().replace(/[^0-9]/g)) {
			$.iaoAlert({ msg: "LowerBound number must be a non-negative integer.", type: "warning", mode: "dark" });
    		$("#txtLowerBound").focus();
			return false;
		}

		if(parseInt($("#txtLowerBound").val()) == 0) {
			$.iaoAlert({ msg: "LowerBound cannot be zero!", type: "warning", mode: "dark" });
    		$("#txtLowerBound").focus();
			return false;
		}

		if(parseInt($("#txtLowerBound").val()) > 2147483647) {
			$.iaoAlert({ msg: "LowerBound cannot be greater than 2147483647!", type: "warning", mode: "dark" });
    		$("#txtLowerBound").focus();
			return false;
		}

		if($("#txtUpperBound").val() == '') {
			$.iaoAlert({ msg: "UpperBound cannot be blank!", type: "warning", mode: "dark" });
    		$("#txtUpperBound").focus();
			return false;
		}
    	
    	if($("#txtUpperBound").val() != $("#txtUpperBound").val().replace(/[^0-9]/g)) {
    		$.iaoAlert({ msg: "UpperBound number must be a non-negative integer.", type: "warning", mode: "dark" });
    		$("#txtUpperBound").focus();
    		return false;
    	}

    	if(parseInt($("#txtUpperBound").val()) == 0) { 
			$.iaoAlert({ msg: "UpperBound cannot be zero!", type: "warning", mode: "dark" });
    		$("#txtUpperBound").focus();
			return false;
		}

		if(parseInt($("#txtUpperBound").val()) > 2147483647) {
			$.iaoAlert({ msg: "UpperBound cannot be greater than 2147483647!", type: "warning", mode: "dark" });
    		$("#txtUpperBound").focus();
			return false;
		}

		if(parseInt($("#txtLowerBound").val()) > parseInt($("#txtUpperBound").val())) {
			$.iaoAlert({ msg: "Upperbound must be greater than or equal to the lowerbound.", type: "warning", mode: "dark" });
    		$("#txtLowerBound").focus();
			return false;
		}

		return true;
    }
});
