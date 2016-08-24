//functions
$(document).ready(function(){
	//login-logout
		$(".login").click(function(){
			$(this).parent().hide();
			$(".logout").parent().show();
		});
		$(".logout").click(function(){
			$(this).parent().hide();
			$(".login").parent().show();
		});
		
	//li elements of left menu
		$(".load-mny").click(function(){
        	$(".load-mny-menu").toggle(500);
    	});
		
		$(".lft-side li a").click(function(){
			$(".lft-side li a").removeClass("active1");
			$(this).addClass("active1");
		});
		
	//left-section slide
		$(".pinion").click(function(){			
			if($('.rght-side').hasClass('col-md-10'))
				{
					$(".lft-side").toggleClass('closed');	
					$(".pinion").css("left", "0");		
					$('.rght-side').removeClass('col-md-10');
					$('.rght-side').addClass('col-md-12');
					$(this).css("transform", "rotate(180deg)");
				}
			else
				{
					$(".lft-side").toggleClass('closed');		
					$(".pinion").css("left", "-12px");		
					$('.rght-side').removeClass('col-md-12');
					$('.rght-side').addClass('col-md-10');
					$('.show').addClass('noshow');
					$(this).css("transform", "rotate(0deg)");
				}			
		});
	
	});