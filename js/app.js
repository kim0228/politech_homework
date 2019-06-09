/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	'use strict'; // 함수나 스크립트의 최상위에 사용된다. 이 문장은 '엄격하게 문법 검사를 하겠다..'로 일단 이해하자
	// ===는 값뿐만 아니라 타입, 형식까지 모두 비교하는 연산자이다.
	Handlebars.registerHelper('eq', function (a, b, options) { // 헬퍼함수를 등록하는 부분
		return a === b ? options.fn(this) : options.inverse(this);
		// all, active, completed부분을 검사한다.
	});

	var ENTER_KEY = 13; // 엔터키
	var ESCAPE_KEY = 27; // ESC키

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';
			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			} // :을 기준으로 왼쪽이 True이고, 오른쪽이 false이다.
			return uuid;
		},
		// todo리스트에 할 일을 적으면 item left부분에 s가 붙는다.
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		//namespace="todos-jQuery", data=undefined
		store: function (namespace, data) {
			if (arguments.length > 1) { // arguments는 숨겨진 속성을 말한다.
				return localStorage.setItem(namespace, JSON.stringify(data)); // setItem은 key값에 매칭된 value값을 인자로 넘겨준다.
				// localStorages는 서버가 아닌 클라이언트에 데이터를 저장하는 api이다.
				// stringfy는 json형태를 문자열로 변환시킨다.
			} else {
				var store = localStorage.getItem(namespace);
				// localStorage는 우리가 적은 할 일을 리스트안에 딕셔너리형식으로 넣은 형태이다.
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () { //
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html()); // html파일의 todo-template html부분을 컴파일한다.
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();

			new Router({ // this는 현재 실행 문맥이다.
				'/:filter': function (filter) { // all, actice, completed부분
					this.filter = filter; // router함수는 html파일을 실행시킬 때 마지막 상태 그대로 다시 보여주는 역할을 하는것 같다.
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () { // (.~~)는 클래스를 의미 (#~~)는 id를 의미한다.
			// html파일에서 this태그가 있던곳
			// bind는 메소드와 객체를 묶어놓는것을 의미한다.
			// bind는 설정을 저장하는 함수를 의미한다.
			$('.new-todo').on('keyup', this.create.bind(this));
			// bindEvents 함수에서 여러가지 이벤트에 관련된 함수를 등록해주었다.
			$('.toggle-all').on('change', this.toggleAll.bind(this));
			$('.footer').on('click', '.clear-completed', this.destroyCompleted.bind(this));
			$('.todo-list')
				.on('change', '.toggle', this.toggle.bind(this))
				// toggle은 선택한 요소가 보이면 보이지 않게, 보이지 않으면 보이게 하는 메소드
				.on('dblclick', 'label', this.editingMode.bind(this))
				.on('keyup', '.edit', this.editKeyup.bind(this))
				// key
				.on('focusout', '.edit', this.update.bind(this)) // 수정할 때
				.on('click', '.destroy', this.destroy.bind(this)); // 할 일 삭제
		},
		render: function () {
			var todos = this.getFilteredTodos();
			$('.todo-list').html(this.todoTemplate(todos)); // html에 뿌려준다.
			// 바인딩을 해서 화면에 나오게 한다.
			$('.main').toggle(todos.length > 0); // 글을 입력하면 toggle을 나타나게 한다.
			$('.toggle-all').prop('checked', this.getActiveTodos().length === 0);
			// prop은 모든 지역에서 사용할 수 있는데, 체크된 속성을 가져와서
			this.renderFooter();
			$('.new-todo').focus();
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () { // section부분의 아랫줄 부분
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			$('.footer').toggle(todoCount > 0).html(template);
		},
		toggleAll: function (e) { // placeholder왼쪽에 있는 v마크를 말한다.
			var isChecked = $(e.target).prop('checked');
     // prop은 속성값을 가져오거나 속성값을 추가하는 메소드이다.
			this.todos.forEach(function (todo) {
				// 체크된 속성값을 넣어준다.
				todo.completed = isChecked;
			});
			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed; // 컴플리티드가 아닌 걸로 바꿔줌. 그러니까 active인것을 그대로 남김.
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}
			return this.todos;
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		getIndexFromEl: function (el) {
			var id = $(el).closest('li').data('id');
			// closet()은 가로안에 있는 요소의 최초 부모 요소를 얻을 수 있게 하는 함수이다.
			// data()는 html요소 내에 데이터를 저장하고 읽는 역할을 하는 함수이다.
			// 여기서는 앞서 저장된 key값인 'id'를 읽어오기 위해서 사용함.
			// id는 key의 value이다.
			// todos는 배열형태이다.
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var $input = $(e.target);
			// $는 jquery를 의미한다. $를 변수앞에 붙이면 제이쿼리의 함수들을 사용할수 있다.
			var val = $input.val().trim();
			// 공백 제거(내가 보기엔 여기가 todo를 적는 함수인것 같다.)
			if (e.which !== ENTER_KEY || !val) { //
				return;
			}

			this.todos.push({
				// id의 값으로 한줄한줄 불러온다.
				// todos는 배열이어서 값을 밀어넣는다.
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val('');

			this.render();
		},
		toggle: function (e) {
			var i = this.getIndexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			//
			this.render();
		},

		editingMode: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			// addClass() 선택한 요소에 클래스값을 추가한다.
			// puts caret at end of input
			var tmpStr = $input.val();
			$input.val('');
			$input.val(tmpStr);
			$input.focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) { // e는 event를 말하며, 엔터키를 눌렀을 때 일어나는 이벤트를 의미한다.
				// blur는 해당 객체에서 포커스를 해제할 때 사용한다.
				e.target.blur();
				// 엔터키를 치면 todolist에 기록이 된다.
				// 버블링: 이벤트가 발생한 요소로부터 window까지 이벤트를 전파한다.
				// blur의 경우에는 버블링이 일어나지 않는다.
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
				// 할 일을 수정할 때, 커서가 표시되는데 esc키를 누르면 커서가 사라지고
				// 위에 새로 할 일을 적는 공간에 커서가 들어감
			}
		},
		update: function (e) {
			var el = e.target; // target으로 이벤트객체를 받아온다.
			var $el = $(el); //$변수는 제이쿼리 변수이므로 모든 스크립트 사용이 가능
			// $()는 getElementById함수의 단축형이다.
			var val = $el.val().trim();// 공백 제거

			if ($el.data('abort')) {
				$el.data('abort', false);
			} else if (!val) {
				this.destroy(e);
				return;
			} else {
				this.todos[this.getIndexFromEl(el)].title = val;
			}

			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.getIndexFromEl(e.target), 1);
			// splice는 배열에서 특정 범위의 값들을 추출하는데, 추출된 요소들은 새로운 배열로 만들어진다.(변수에다 담으면)
			// 여기서는 하나의 값까지만 가져온다.
			this.render();
		}
	};

	App.init();
});
