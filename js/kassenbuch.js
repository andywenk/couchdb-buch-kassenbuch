var Kassenbuch = (function() {
  var module = {},
      host = location.protocol + '//' + location.host,
      db = 'kassenbuch',
      $wrapper = $('#wrapper'),
      $pages = $wrapper.find('div.js_page'),
      $buttons = $wrapper.find('ul li a'),
      $overview = $wrapper.find('.js_overview'),
      $booking_list = $('div.list table.js_list tbody'),
      $errorMessage = $wrapper.find('div.js_error'),
      $form = $('form.js_save')
      
  module.init = function() {
    module.hidePages()
    module.switchPage('default')
    module.summary()
    module.list()
    module.registerEventHandler()
  }
  
  module.registerEventHandler = function() {
    $buttons.live('click', function(e) {
      e.preventDefault()
      module.switchPage($(this).attr('href'))
    })
    
    $('select.js_group_level').live('change', function() {
      module.list($(this).val())
    })
    
    $form.live('submit', function(e) {
      e.preventDefault()
      module.saveDocument($(this).serialize())
    })
    
    $('a.js_edit').live('click', function(e) {
      e.preventDefault()
      module.editDocument($(this).attr('href'))
    })
    
    $('a.js_del').live('click', function(e) {
      e.preventDefault()
      module.deleteDocument($(this).attr('href'))
    })
  }
  
  module.hidePages = function() {
    $pages.css('display', 'none')
  }
  
  module.switchPage = function(to) {
    module.hidePages()
    $errorMessage.html('')
    module.resetForm()
    $wrapper.find('.' + to).css('display', 'block')
    module.list()
  }
  
  module.summary = function() {
    module.request(module.createUrl('_design/buchhaltung/_view/auswertung?group_level=1'), function(res) {
      $overview.find('.js_ausgabe').html(module.formatNumber(res['rows'][0]['value']))
      $overview.find('.js_einnahme').html(module.formatNumber(res['rows'][1]['value']))
    })
  }
  
  module.list = function(group_level) {
    var gl = (group_level) ? 'group_level=' + group_level : 'group=true'
    
    module.request(module.createUrl('_design/buchhaltung/_view/auswertung?' + gl), function(res) {
      $booking_list.html('')
      $.each(res, function(index, value) {
        $.each(value, function(i, v) {
          $booking_list.append(module.createRow(module.fillResult(v), group_level))    
        })
      })
    })
  }
  
  module.fillResult = function(v) {
    var res = []
    for(i = 0; i < 7; i++) {
      res[i] = v.key[i] || '--' 
    }
    return res.concat(v.value)
  }
  
  module.createRow = function(val, group_level) {
    var data = {}, 
        out = '<tr>'
    
    $.each(val, function(i, v) {
      if(/:/.test(v)) {
        d = v.split(':')
        data[d[0]] = d[1]
      }
      
      out += '<td>' + v + '</td>'
    })
    
    out += (group_level) ? '<td>&nbsp;</td>' : '<td><a href="' + data.id + '" class="js_edit edit" title="bearbeiten">B</a>&nbsp;<a href="' + data.id + '" class="js_del del" title="löschen">L</a></td>'
    out += '</tr>'
    
    return out
  }
  
  module.saveDocument = function(data) {
    $rev = $form.find('input.js_rev')
    $id =  $form.find('input.js_id')
    
    if($rev.val()) {
     $id.attr('readonly', true)
    }
    
    var objData = module.toObj(data),
        id = objData['_id']

    delete objData['_id']

    if(!objData['_rev']) {
      delete objData['_rev']
    }

    module.request(module.createUrl(id), function(res) {
      $rev.val(res.rev)
      $id.attr('readonly', true)
      $errorMessage.html('Dokument gespeichert mit Revision ' + res.rev)
    }, 'PUT', objData)
  }
  
  module.editDocument = function(id) {
    module.switchPage('form')
    module.request(module.createUrl(id), function(res) {
      $.each($form.find('input, select, textarea'), function(i, v) {
        $(v).val(res[$(v).attr('name')])
      })
      $form.find('input.js_id').attr('readonly', true)
    })
  }
  
  module.deleteDocument = function(id) {
    module.request(module.createUrl(id), function(res) {
      var url = id + "?rev=" + res._rev 
      module.request(module.createUrl(url), function(res) {
        $errorMessage.html('Dokument mit der ID ' + id + ' gelöscht')
        module.list()
      }, 'DELETE')
    })
  }
  
  module.resetForm = function() {
    $.each($form.find('input, select, textarea'), function(i, v) {
      if($(v).hasClass('js_no_reset')) {return true}
      $(v).val('')
    })
    
    $form.find('input.js_id').attr('readonly', false)
  }
  
  module.request = function (url, requestMethod, httpMethod, data) {
    $.ajax({
      type: httpMethod || 'GET',
      contentType: "application/json",
      url: url,
      dataType: 'json',
      data: module.toJSON(data),
      error: function (xhr, status) {
        $errorMessage.html("XHR Fehler: " + xhr + " " + status)
      },
      success: function (response) {
        requestMethod.call(this, response)
      }
    })
  }
  
  module.createUrl = function(queryString) {
    return [host, db, queryString].join('/')
  }
  
  module.formatNumber = function(number) {
    var res = String(number).match(/^(\d+\.\d{1,2})\d*$/)
    return ($.isArray(res)) ? parseFloat(res[1], 10) : number
  }
  
  module.toObj = function(paramString) {
    var params = paramString.split('&'),
        obj = {}
        
    $.each(params, function(i,val) {
      v = val.split('=')
      if(v[1] === '') {return true}
      obj[v[0]] = (isNaN(v[1])) ? decodeURIComponent(v[1].replace(/\+/g, ' ')) : parseFloat(v[1]) 
    })
    
    return obj
  }
  
  module.toJSON = function(obj) {
    return obj !== null ? JSON.stringify(obj) : null;
  }
  
  $(document).ready(module.init)
  
  return module;
}())