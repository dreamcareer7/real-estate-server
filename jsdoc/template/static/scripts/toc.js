(function ($) {
  $.fn.toc = function (options) {
    const self = this
    const opts = $.extend({}, jQuery.fn.toc.defaults, options)

    const container = $(opts.container)
    const headings = $(opts.selectors, container)
    const headingOffsets = []
    const activeClassName = opts.prefix + '-active'
    const navbarHeight = $('.navbar').height()

    const scrollTo = function (e) {
      if (opts.smoothScrolling) {
        e.preventDefault()
        const elScrollTo = $(e.target).attr('href')
        const $el = $(elScrollTo)
        const offsetTop = $el.offset().top - navbarHeight

        $('body,html').animate({scrollTop: offsetTop}, 400, 'swing', function () {
          location.hash = elScrollTo
        })
      }
      $('li', self).removeClass(activeClassName)
      $(e.target).parent().addClass(activeClassName)
    }

  // highlight on scroll
    let timeout
    const highlightOnScroll = function (e) {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(function () {
        let top = $(window).scrollTop(),
          highlighted
        for (let i = 0, c = headingOffsets.length; i < c; i++) {
          if (headingOffsets[i] >= top) {
            $('li', self).removeClass(activeClassName)
            if (i > 0) {
              highlighted = $('li:eq(' + (i - 1) + ')', self).addClass(activeClassName)
              opts.onHighlight(highlighted)
            }
            break
          }
        }
      }, 50)
    }
    if (opts.highlightOnScroll) {
      $(window).bind('scroll', highlightOnScroll)
      highlightOnScroll()
    }

    return this.each(function () {
    // build TOC
      const el = $(this)
      const ul = $('<ul/>')
      headings.each(function (i, heading) {
        const $h = $(heading)
        headingOffsets.push($h.offset().top - opts.highlightOffset)

      // add anchor
        const anchor = $('<span/>').attr('id', opts.anchorName(i, heading, opts.prefix)).insertBefore($h)

      // build TOC item
        const a = $('<a/>')
        .text(opts.headerText(i, heading, $h))
        .attr('href', '#' + opts.anchorName(i, heading, opts.prefix))
        .bind('click', function (e) {
          scrollTo(e)
          el.trigger('selected', $(this).attr('href'))
        })

        const li = $('<li/>')
        .addClass(opts.itemClass(i, heading, $h, opts.prefix))
        .append(a)

        ul.append(li)
      })
      el.html(ul)
    })
  }

  jQuery.fn.toc.defaults = {
    container:         'body',
    selectors:         'h1,h2,h3',
    smoothScrolling:   true,
    prefix:            'toc',
    onHighlight:       function () {},
    highlightOnScroll: true,
    highlightOffset:   100,
    anchorName:        function (i, heading, prefix) {
      return prefix + i
    },
    headerText: function (i, heading, $heading) {
      return $heading.text()
    },
    itemClass: function (i, heading, $heading, prefix) {
      return prefix + '-' + $heading[0].tagName.toLowerCase()
    }

  }
})(jQuery)
