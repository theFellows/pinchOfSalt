

var dropdown = document.getElementsByClassName("dropdown-btn");
var i;

for (i = 0; i < dropdown.length; i++) {
  dropdown[i].addEventListener("click", function() {
  this.classList.toggle("active");
  var dropdownContent = this.nextElementSibling;
  if (dropdownContent.style.display === "block") {
  dropdownContent.style.display = "none";
  } else {
  dropdownContent.style.display = "block";
  }
  });
}

$(document).ready(function() {
var max_fields      = 30; //maximum input boxes allowed
var wrapper   		= $(".input_fields_wrap"); //Fields wrapper
var add_button      = $(".add_field_button"); //Add button ID

var x = 1; //initlal text box count
$(add_button).click(function(e){ //on add input button click
e.preventDefault();
if(x < max_fields){ //max input box allowed
 x++; //text box increment
 $(wrapper).append(`<br><div> <input id="ingr" class="edit" type="text" value="" name="measure" placeholder="1 tps"></input>
 <input id="ingr" class="edit" type="text" value="" name="ingredient" placeholder="salt"></input>
 <a href="#" class="remove_field"><i class="fa fa-trash-o" style="font-size:20px;color:#cf1717"></i></a><br>`); //add input box
}
});

$(wrapper).on("click",".remove_field", function(e){ //user click on remove text
e.preventDefault(); $(this).parent('div').remove(); x--;
})
});

