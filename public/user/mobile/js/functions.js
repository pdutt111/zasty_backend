$(document).ready(function(){		
	$(".knowmore").click(function(){
		$(".knowmore-wrpr").css('display', 'table-cell');
	});	
	$(".knowmore-close").click(function() {
	    $('.knowmore-wrpr').css('display', 'none');
	});

	$(".hmbrg-menu").click(function(){
        $(".main-menu").slideToggle();
    });

    $(".sec-header .hmbrg-menu").click(function(){
        $('.side-menu').css('left', '0')
    });

    $(".side-menu .close").click(function(){
        $('.side-menu').css('left', '-100%')
    });

	$(".fltr-wrpr").click(function(){
        $(".foodcat-wrpr").slideToggle();
    });


	$(".ordr-dtl").click(function(){
        $(".prchsd-dtl").slideToggle();
    });

    $(".chng-city").click(function(){
       $('.side-menu').css('left', '-100%');
       $('.location-wrpr').css('display', 'table');
    });

    $(".location-wrpr li").click(function() {
	    $('.location-wrpr').css('display', 'none');	    
	});

    $(".cart-wrpr").click(function(){			
		$('.cartslide-wrpr').css('right', '0');		
	});

	$(".rightslide").click(function(){
		$(".cartslide-wrpr").css('right', '-100%');
	});	

    $( ".profile.editbl p em" ).click(function() {
      $( this ).parent().toggleClass( "save" );    
    });  
})	