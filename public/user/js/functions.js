$(document).ready(function () {
    $(".popup-trig").click(function () {
        $(".pop-cntnt").css('display', 'table');
    });
    $(".pop-cntnt li").click(function () {
        $('.pop-cntnt').css('display', 'none');
    });

    $(".knowmore").click(function () {
        $(".knowmore-wrpr").css('display', 'table');
    });
    $(".knowmore-close").click(function () {
        $('.knowmore-wrpr').css('display', 'none');
    });

    $(".fltr-wrpr").click(function () {
        $(".foodcat-wrpr").slideToggle();
    });

    $(".cart-wrpr").click(function () {
        $('.cartslide-wrpr').css('display', 'block')
        $('.cartslide-wrpr .cntnt').css('right', '0px');
    });
    $(".rightslide").click(function () {
        $(".cartslide-wrpr").css('display', 'none');
    });
    alertify.defaults.glossary.title="Zasty";
})
$(".cartslide-wrpr .cntnt").click(function (e) {
    e.stopPropagation();
    return false;
});