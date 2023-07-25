/* Lute functions. */

/**
 * The current term index (either clicked or hovered over)
 */
let LUTE_CURR_TERM_DATA_ORDER = -1;  // initially not set.

/**
 * Lute has 2 different "modes" when reading:
 * - LUTE_HOVERING = true: Hover mode, not selecting
 * - LUTE_HOVERING = false: Word clicked, or click-drag
 */ 
let LUTE_HOVERING = true;


/**
 * When the reading pane is first loaded, it is set in "hover mode",
 * meaning that when the user hovers over a word, that word becomes
 * the "active word" -- i.e., status update keyboard shortcuts should
 * operate on that hovered word, and as the user moves the mouse
 * around, the "active word" changes.  When a word is clicked, though,
 * there can't be any "hover changes", because the user should be
 * editing the word in the Term edit pane, and has to consciously
 * disable the "clicked word" mode by hitting ESC or RETURN.
 *
 * When the user is done editing a the Term form in the Term edit pane
 * and hits "save", the main reading page's text div is updated (see
 * templates/read/updated.twig.html).  This text div reload then has
 * to notify _this_ javascript to start_hover_mode() again.
 * 
 * I dislike this code (specifically, that the updated.twig.html calls
 * this javascript function), but can't think of a better way to
 * manage this.
 */
function start_hover_mode(should_clear_frames = true) {
  // console.log('CALLING RESET');
  load_reading_pane_globals();
  LUTE_HOVERING = true;

  $('span.kwordmarked').removeClass('kwordmarked');

  if (should_clear_frames)
    clear_frames();

  clear_newmultiterm_elements();

  // https://stackoverflow.com/questions/35022716/keydown-not-detected-until-window-is-clicked
  $(window).focus();
}

let clear_frames = function() {
  $('#wordframeid').attr('src', '/read/empty');
  $('#dictframeid').attr('src', '/read/empty');
}

/** 
 * Prepare the interaction events with the text.
 */
function prepareTextInteractions(textid) {
  const t = $('#thetext');
  // Using "t.on" here because .word elements
  // are added and removed dynamically, and "t.on"
  // ensures that events remain for each element.
  t.on('mousedown', '.word', select_started);
  t.on('mouseover', '.word', select_over);
  t.on('mouseup', '.word', select_ended);

  t.on('mouseover', '.word', hover_over);
  t.on('mouseout', '.word', hover_out);
  
  $(document).on('keydown', handle_keydown);

  $('#thetext').tooltip({
    position: { my: 'left top+10', at: 'left bottom', collision: 'flipfit flip' },
    items: '.word.showtooltip',
    show: { easing: 'easeOutCirc' },
    content: function () { return tooltip_textitem_hover_content($(this)); }
  });
}


/**
 * Build the html content for jquery-ui tooltip.
 */
let tooltip_textitem_hover_content = function (el) {

  let tooltip_title = function() {
    let t = el.attr('data_text');
    const parent_text = el.attr('parent_text') ?? '';
    if (parent_text != '')
      t = `${t} (${parent_text})`;
    return t;
  }

  const status_span = function() {
    const status = parseInt(el.attr('data_status'));
    const st = STATUSES[status];
    const statname = `[${st['abbr']}]`;
    return `<span style="margin-left: 12px; float: right;" class="status${status}">${statname}</span>`;
  }

  let image_if_src = function(el, attr) {
    const filename = el.attr(attr) ?? '';
    if (filename == '')
      return '';
    return `<img class="tooltip-image" src="${filename}" />`;
  }

  let tooltip_images = function() {
    const images = [ 'data_img_src', 'parent_img_src' ].
          map(s => image_if_src(el, s));
    const unique = (value, index, self) => {
      return self.indexOf(value) === index
    }
    const unique_images = images.filter(unique).join(' ');
    if (unique_images == ' ')
      return '';
    return `<p>${unique_images}</p>`;
  }

  let build_entry = function(term, transl, roman, tags) {
    let have_val = (v) => v != null && `${v}`.trim() != '';
    if (!have_val(term))
      return '';
    let ret = [ `<b>${term}</b>` ];
    if (have_val(roman))
      ret.push(` <i>(${roman})</i>`);
    if (have_val(transl))
      ret.push(`: ${transl}`);
    if (have_val(tags))
      ret.push(` [${tags}]`);
    return `<p>${ret.join('')}</p>`;
  }

  let get_attr = a => (el.attr(a) ?? '').
      trim().
      replace(/(\r\n|\n|\r)/gm, "<br />");  // Some translations have cr/lf.
  ptrans = get_attr('parent_trans');
  ctrans = get_attr('data_trans');
  ctags = get_attr('data_tags');

  let translation_content = ctrans;
  if (ctags != '') {
    translation_content = `${translation_content} [${ctags}]`;
  }
  if (ptrans != '' && ctrans != '' && ctrans != ptrans) {
    // show both.
    translation_content = [
      build_entry(el.text(), ctrans, el.attr('data_rom'), el.attr('data_tags')),
      build_entry(el.attr('parent_text'), ptrans, null, el.attr('parent_tags'))
    ].join('');
  }
  if (ptrans != '' && ctrans == '') {
    translation_content = build_entry(el.attr('parent_text'), ptrans, null, el.attr('parent_tags'));
  }

  let content = `<p><b style="font-size:120%">${tooltip_title()}</b>${status_span()}</p>`;
  const flash = get_attr('data_flashmessage');
  if (flash != '')
    content += `<p class="small-flash-notice">${flash}</p>`;
  const rom = get_attr('data_rom');
  if (rom != '')
    content += `<p><i>${rom}</i></p>`;
  content += translation_content;
  content += tooltip_images();
  return content;
}


function showEditFrame(el, extra_args = {}) {
  const lid = parseInt(el.attr('lid'));

  let text = extra_args.textparts ?? [ el.attr('data_text') ];
  const sendtext = text.join('');

  let extras = Object.entries(extra_args).
      map((p) => `${p[0]}=${encodeURIComponent(p[1])}`).
      join('&');

  // Annoying hack.  I wanted to send a period '.' in the term, but
  // Symfony didn't handle that well (per issue
  // https://github.com/jzohrab/lute/issues/28), and replacing the '.'
  // with the encoded value ('\u2e' or '%2E') didn't work, as it kept
  // getting changed back to '.' on send, or it said that it couldn't
  // find the controller route.  There is probably something very
  // simple I'm missing, but for now, replacing the '.' with a hacky
  // string which I'll replace on server side as well.
  const periodhack = '__LUTE_PERIOD__';
  const url = `/read/termform/${lid}/${sendtext}?${extras}`.replaceAll('.', periodhack);
  // console.log('go to url = ' + url);

  top.frames.wordframe.location.href = url;
}


function show_help() {
  const url = `/read/shortcuts`;
  top.frames.wordframe.location.href = url;
}


let save_curr_data_order = function(el) {
  LUTE_CURR_TERM_DATA_ORDER = parseInt(el.attr('data_order'));
}

/* ========================================= */
/** Hovering */

function hover_over(e) {
  if (! LUTE_HOVERING)
    return;
  $('span.wordhover').removeClass('wordhover');
  $(this).addClass('wordhover');
  save_curr_data_order($(this));
}

function hover_out(e) {
  if (! LUTE_HOVERING)
    return;
  $('span.wordhover').removeClass('wordhover');
}

/* ========================================= */
/** Multiword selection */

let selection_start_el = null;

let clear_newmultiterm_elements = function() {
  $('.newmultiterm').removeClass('newmultiterm');
  selection_start_el = null;
}

function select_started(e) {
  LUTE_HOVERING = false;
  $('span.wordhover').removeClass('wordhover');
  clear_newmultiterm_elements();
  clear_frames();
  $(this).addClass('newmultiterm');
  selection_start_el = $(this);
  save_curr_data_order($(this));
}

let get_selected_in_range = function(start_el, end_el, selector) {
  const first = parseInt(start_el.attr('data_order'))
  const last = parseInt(end_el.attr('data_order'));

  let startord = first;
  let endord = last;

  if (startord > endord) {
    endord = first;
    startord = last;
  }

  const selected = $(selector).filter(function() {
    const ord = $(this).attr("data_order");
    return ord >= startord && ord <= endord;
  });
  return selected;
};

function select_over(e) {
  if (selection_start_el == null)
    return;  // Not selecting
  $('.newmultiterm').removeClass('newmultiterm');
  const selected = get_selected_in_range(selection_start_el, $(this), 'span.textitem');
  selected.addClass('newmultiterm');
}

function select_ended(e) {
  // Handle single word click.
  if (selection_start_el.attr('id') == $(this).attr('id')) {
    clear_newmultiterm_elements();
    word_clicked($(this), e);
    return;
  }

  $('span.kwordmarked').removeClass('kwordmarked');

  const selected = get_selected_in_range(selection_start_el, $(this), 'span.textitem');
  if (e.shiftKey) {
    copy_text_to_clipboard(selected.toArray());
    start_hover_mode(false);
    return;
  }

  const textparts = selected.toArray().map((el) => $(el).text());
  const text = textparts.join('').trim();
  if (text.length > 250) {
    alert(`Selections can be max length 250 chars ("${text}" is ${text.length} chars)`);
    start_hover_mode();
    return;
  }

  showEditFrame(selection_start_el, { textparts: textparts });
  selection_start_el = null;
}


let word_clicked = function(el, e) {
  el.removeClass('wordhover');
  save_curr_data_order(el);
  if (el.hasClass('kwordmarked')) {
    el.removeClass('kwordmarked');
    const nothing_marked = $('span.kwordmarked').length == 0;
    if (nothing_marked) {
      el.addClass('wordhover');
      start_hover_mode();
    }
  }
  else {
    if (! e.shiftKey) {
      $('span.kwordmarked').removeClass('kwordmarked');
      showEditFrame(el);
    }
    el.addClass('kwordmarked');
  }
}


/********************************************/
// Keyboard navigation.

// Load all words into scope.
var words = null;
var maxindex = null;

function load_reading_pane_globals() {
  words = $('span.word').sort(function(a, b) {
    return $(a).attr('data_order') - $(b).attr('data_order');
  });
  // console.log('have ' + words.size() + ' words');
  maxindex = words.size() - 1;
}

$(document).ready(load_reading_pane_globals);


let current_word_index = function() {
  const i = words.toArray().findIndex(x => parseInt(x.getAttribute('data_order')) === LUTE_CURR_TERM_DATA_ORDER);
  // console.log(`found index = ${i}`);
  return i;
};


/** Get the rest of the textitems in the current active/hovered word's
 * sentence or paragraph, or null if no selection. */
let get_textitems_spans = function(e) {
  const selindex = current_word_index();
  if (selindex == -1)
    return null;

  const w = words.eq(selindex);

  let attr_name = 'seid';
  let attr_value = w.attr('seid');

  if (e.shiftKey) {
    attr_name = 'paraid';
    attr_value = w.attr('paraid');
  }

  return $('span.textitem').toArray().filter(x => x.getAttribute(attr_name) === attr_value);
};

/** Copy the text of the textitemspans to the clipboard, and add a
 * color flash. */
let handle_copy = function(e) {
  tis = get_textitems_spans(e);
  if (tis == null)
    return;
  copy_text_to_clipboard(tis);
}

let copy_text_to_clipboard = function(textitemspans, show_flash = true) {
  const copytext = textitemspans.map(s => $(s).text()).join('');

  // console.log('copying ' + copytext);
  var textArea = document.createElement("textarea");
  textArea.value = copytext;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("Copy");
  textArea.remove();

  const removeFlash = function() {
    // console.log('removing flash');
    $('span.flashtextcopy').addClass('wascopied'); // for acceptance testing.
    $('span.flashtextcopy').removeClass('flashtextcopy');
  };

  // Add flash, set timer to remove.
  removeFlash();
  textitemspans.forEach(function (t) {
    $(t).addClass('flashtextcopy');
  });
  setTimeout(() => removeFlash(), 1000);

  $('#wordframeid').attr('src', '/read/flashcopied');
}


let set_cursor = function(newindex) {
  LUTE_HOVERING = false;
  $('span.wordhover').removeClass('wordhover');
  clear_newmultiterm_elements();

  if (newindex < 0 || newindex >= words.size())
    return;
  let curr = words.eq(newindex);
  save_curr_data_order(curr);
  $('span.kwordmarked').removeClass('kwordmarked');
  curr.addClass('kwordmarked');
  $(window).scrollTo(curr, { axis: 'y', offset: -150 });
  showEditFrame(curr, { autofocus: false });
}


let find_non_Ign_or_Wkn = function(currindex, shiftby) {
  let newindex = currindex + shiftby;
  while (newindex >= 0 && newindex <= maxindex) {
    const nextword = words.eq(newindex);
    const st = nextword.attr('data_status');
    if (st != 99 && st != 98) {
      break;
    }
    newindex += shiftby;
  }
  return newindex;
};

let move_cursor = function(shiftby, e) {
  const currindex = current_word_index();
  if (! e.shiftKey) {
    set_cursor(currindex + shiftby);
  }
  else {
    set_cursor(find_non_Ign_or_Wkn(currindex, shiftby));
  }
}


let show_translation = function(e) {
  tis = get_textitems_spans(e);
  if (tis == null)
    return;
  const sentence = tis.map(s => $(s).text()).join('');
  // console.log(sentence);

  const userdict = $('#translateURL').text();
  if (userdict == null || userdict == '')
    console.log('No userdict for lookup.  ???');

  // console.log(userdict);
  const url = userdict.replace('###', encodeURIComponent(sentence));
  if (url[0] == '*') {
    const finalurl = url.substring(1);  // drop first char.
    const settings = 'width=800, height=400, scrollbars=yes, menubar=no, resizable=yes, status=no';
    window.open(finalurl, 'dictwin', settings);
  }
  else {
    top.frames.dictframe.location.href = url;
  }
}


function handle_keydown (e) {
  if (words.size() == 0) {
    // console.log('no words, exiting');
    return; // Nothing to do.
  }

  // Map of key codes (e.which) to lambdas:
  let map = {};

  const kESC = 27;
  const kRETURN = 13;
  const kHOME = 36;
  const kEND = 35;
  const kLEFT = 37;
  const kRIGHT = 39;
  const kC = 67; // C)opy
  const kT = 84; // T)ranslate
  const k1 = 49;
  const k2 = 50;
  const k3 = 51;
  const k4 = 52;
  const k5 = 53;
  const kI = 73;
  const kW = 87;

  map[kESC] = () => start_hover_mode();
  map[kRETURN] = () => start_hover_mode();
  map[kHOME] = () => set_cursor(0);
  map[kEND] = () => set_cursor(maxindex);
  map[kLEFT] = () => move_cursor(-1, e);;
  map[kRIGHT] = () => move_cursor(+1, e);;
  map[kC] = () => handle_copy(e);
  map[kT] = () => show_translation(e);
  map[k1] = () => update_status_for_marked_elements(1);
  map[k2] = () => update_status_for_marked_elements(2);
  map[k3] = () => update_status_for_marked_elements(3);
  map[k4] = () => update_status_for_marked_elements(4);
  map[k5] = () => update_status_for_marked_elements(5);
  map[kI] = () => update_status_for_marked_elements(98);
  map[kW] = () => update_status_for_marked_elements(99);

  if (e.which in map) {
    let a = map[e.which];
    a();
  }
  else {
    // console.log('unhandled key ' + e.which);
  }
}


/**
 * post update ajax call, fix the UI.
 */
function update_selected_statuses(newStatus) {
  const newClass = `status${newStatus}`;
  let update_status = function (e) {
    const curr = $(this);
    ltext = curr.text().toLowerCase();
    matches = $('span.word').toArray().filter(el => $(el).text().toLowerCase() == ltext);
    matches.forEach(function (m) {
      $(m).removeClass('status98 status99 status0 status1 status2 status3 status4 status5 shiftClicked')
        .addClass(newClass)
        .attr('data_status',`${newStatus}`);
    });
  };
  $('span.kwordmarked').each(update_status);
  $('span.wordhover').each(update_status);
}


function update_status_for_marked_elements(new_status) {
  let els = $('span.kwordmarked').toArray().concat($('span.wordhover').toArray());
  if (els.length == 0)
    return;
  const firstel = $(els[0]);
  const textid = firstel.attr('tid');

  els = els.map(el => $(el).text());

  $.ajax({
    url: '/read/update_status',
    type: 'post',
    data: { textid: textid, terms: els, new_status: new_status },
    dataType: 'JSON',
    success: function(response) {
      update_selected_statuses(new_status);
    },
    error: function(response, status, err) {
      const msg = {
        response: response,
        status: status,
        error: err
      };
      console.log(`failed: ${JSON.stringify(msg, null, 2)}`);
    }
  });

}
