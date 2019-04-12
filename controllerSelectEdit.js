const out = require('electron').remote.require('./out')

let ControllerSelectEdit = function() {
	this.view = {
		selectBox: null,
		inputField: null,
		buttonSave: null,
		buttonDel: null
	}
	this.refs = {
		textColumn: null,
		pkColumn: null,
		fkColumn: null,
		fkValue: null,
		tableName: null
	}
	this.logic = {
		onSave: null,
		onDelete: null,
		onSelect: null,
	}
	this.hooks = {
		onSelect: null,
		onSave: null,
		onDelete: null
	}
	this.data = {
		all: null,
		current: null,
		fetch: null
	}
	this._child = null,
	this.options = {
		faixaNumRegexp: new RegExp(/^[fF]aixa(\s)*(::){1}(\s)*(\d)+(\s)*a(\s)*(\d)+$/),
		faixaNumPermitido: false
	}
}



ControllerSelectEdit.prototype.getSelectedDobId = function() {
	// retorna nulo se nao houver item selecionado ou se
	// o item não possuir um DOB associado
	let sb = this.view.selectBox
	if( !sb || sb.selectedIndex == -1 ) return null
	let DOB = sb.options.item( sb.selectedIndex ).DOB
	return DOB ? DOB[this.refs.pkColumn] : null
}



ControllerSelectEdit.prototype.getSelectedDob = function() {
	let sb = this.view.selectBox
	if( !sb || sb.selectedIndex == -1 ) return null
	else return sb.options.item( sb.selectedIndex ).DOB
}



ControllerSelectEdit.prototype.setView = function( selectBox, inputField, buttonSave, buttonDel ) {
	this.view.selectBox = document.getElementById( selectBox )
	this.view.inputField = document.getElementById( inputField )
	this.view.buttonSave = document.getElementById( buttonSave )
	this.view.buttonDel = document.getElementById( buttonDel )
}



ControllerSelectEdit.prototype.setRefs = function( textColumn, pkColumn, fkColumn, fkValue, tableName ) {
	this.refs.textColumn = textColumn
	this.refs.pkColumn = pkColumn
	this.refs.fkColumn = fkColumn
	this.refs.fkValue = fkValue
	this.refs.tableName = tableName
}



ControllerSelectEdit.prototype.updateChild = function( child ) {
	if( child ) this._child = child
	if( this._child instanceof controllerSelectEdit ) {
		this._child.setFkValue( this.getSelectedDobId() )
	}
}



ControllerSelectEdit.prototype.setFkValue = function( fkValue ) {
	this.refs.fkValue = fkValue
	this.render()
}



ControllerSelectEdit.prototype.boot = async function() {
	// carregar os dados
	this.data.all = await this.data.fetch()
	console.log
	this._setupView()
	this.render()
}



ControllerSelectEdit.prototype.render = function() {
	let allData = this.data.all
	let txtCol = this.refs.textColumn
	let slcBox = this.view.selectBox
	let inpBox = this.view.inputField
	// esvazia os inputs
	inpBox.value = ''
	slcBox.innerHTML=''
	// se as views nao estiverem definidas, pare aqui
	if( !allData || !slcBox || !inpBox ) return false
	// filtrar os dados
	this.data.current = this.data.all.filter(
		item => item[this.refs.fkColumn] == this.refs.fkValue
	)
	// populate select 
	let curData = this.data.current
	for( let i = 0; i < curData.length; i++ ) {
		let text = txtCol ? curData[i][txtCol] : curData[i][0]
		let value = curData[i][this.refs.pkColumn]
		let option = this._newOption( text, value, curData[i] )
		slcBox.options.add( option )
	}
	// adiciona a opção '+' se a Foreing Key nao for null
	if( this.refs.fkValue != null ) this._insertEmptyOpt()
	this._callOnChangeHooks()
}



ControllerSelectEdit.prototype._setupView = function() {
	let th = this
	function onEvent(obj,type,handler) {
		obj.removeEventListener(type,handler)
		obj.addEventListener(type,handler)
		obj.controller = th
	}
	onEvent(this.view.selectBox,'change',this._changeOpt)
	onEvent(this.view.buttonSave,'click',this._clickBtSave)
	onEvent(this.view.buttonDel,'click',this._clickBtDel)
}



ControllerSelectEdit.prototype._newOption = function( text, value, DOB ) {
	opt = document.createElement( "option" )
	opt.text = text
	opt.value = value
	opt.DOB = DOB
	return opt
}



ControllerSelectEdit.prototype._insertEmptyOpt = function( select=true ) {
	//if( select === undefined ) select = true
	let newOpt = this._newOption( "+", null, null )
	this.view.selectBox.options.add( newOpt )
	if( select ) {
		newOpt.selected = true //slcBox.selectedIndex = slcBox.length-1
		this.view.inputField.value = ''
		this.view.inputField.focus()
	}
}



ControllerSelectEdit.prototype._changeOpt = function( ev ) {
	let ctrl = ev.target.controller
	let slcBox = ev.target
	let opt = slcBox.selectedOptions[0]
	let inpBox = slcBox.controller.view.inputField
	inpBox.value = opt.DOB ? opt.text : ""
	if( !opt.DOB ) inpBox.focus()
	//console.log( 'DOB selected:\n' );console.log( opt.DOB )
	ctrl.updateChild()
	// chama os hooks de onSelect 
	ctrl._callOnChangeHooks( opt )
}



ControllerSelectEdit.prototype._callOnChangeHooks = function( opt ) {
	let onSelect = this.logic.onSelect
	let hookOnSelect = this.hooks.onSelect
	if( typeof onSelect === 'function' ) onSelect( opt )
	if( typeof hookOnSelect === 'function' ) hookOnSelect( opt )
}



ControllerSelectEdit.prototype._clickBtSave = async function( ev ) {
	let ctrl = ev.target.controller
	let r = ctrl.refs
	let v = ctrl.view
	let l = ctrl.logic
	
	let selected = v.selectBox.options.item( v.selectBox.selectedIndex )
	// se nada estiver selecionado
	if( !selected ) {
		alert( 'Selecione um item primeiro' )
		return false
	}
	let newText = v.inputField.value.trim()
	let oldText = selected.text

	let validacao = ctrl._validaFaixaDeNumero( newText )
	if( validacao == -1 ) return
	if( validacao == 1 ) newText = ctrl._formatFaixaDeNumeros( newText )

	console.log({validacao},{newText})
	
	if( newText.length > 0 ) {
		let success = true
		// modo 'insert' se a opção '+' estiver selecionada (ela não possui um DOB associado)
		let isInsert = !selected.DOB
		let DOB = isInsert ? {} : selected.DOB
		// adiciona informacao no DOB
		DOB[r.fkColumn] = r.fkValue
		DOB[r.textColumn] = newText
		console.log(JSON.stringify(DOB))
		if( typeof l.onSave === 'function') {
			// chama funcao de salvamento externa
			let res = await l.onSave( DOB, r.pkColumn )
			if( res === false ) { // cancela a salvamento
				DOB[r.textColumn] = oldText
				success = false
			}
			else if( res.err ) { // erro no salvamento
				DOB[r.textColumn] = oldText
				alert( "Ocorreu um erro ao tentar salvar o item" )
				success = false
				throw res.err
			} else { // salvamento bem sucedido
				console.log( 'ControllerSelectEdit: data saved successfully' )
				selected.DOB = res.DOB
				selected.text = res.DOB[r.textColumn]
				if( isInsert ) {
					ctrl._addDOB( selected.DOB )
					// if(ctrl._child) {
					// 	ctrl._insertEmptyOpt( false )
					// } else {
					// 	ctrl._insertEmptyOpt()
					// 	ctrl.view.inputField.focus()
					// }
				}
			}
		} else { // não existe função de salvamento
			selected.DOB = DOB
			selected.text = DOB[r.textColumn]
			if( isInsert ) ctrl._insertEmptyOpt()
		}
		if( success && isInsert ) {
			ctrl._insertEmptyOpt( !ctrl._child )
			ctrl.updateChild()
			if( ctrl._child ) ctrl._child.view.inputField.focus()
			ctrl._callOnChangeHooks( selected )
		}
	}
}



/**
 * Verifica se a opção a ser incluída é uma faixa de números e se ela pode ou não ser incluída,
 * caso já exista outras opções existentes.
 * Retorna:	1 se é faixa de número e pode ser incluída;
 * 			-1 se é faixa de número e não pode ser inlcuída ou se já existe uma faixa de números;
 * 			0 se não é faixa de número 
 */
ControllerSelectEdit.prototype._validaFaixaDeNumero = function( newText ) {
	let isEmptyList = this.data.current.length == 0
	let thereIsOnlyOneItem  = this.data.current.length <= 1
	let isNewItem = !this.view.selectBox.selectedOptions[0].DOB
	let isEditingOnlyItem = thereIsOnlyOneItem && !isNewItem
	// Se já existe uma faixa de numeros
	if( this._existeFaixaDeNumeros() && !isEditingOnlyItem ) {
		alert('Já existe um item do tipo faixa de núemeros. Se quiser inserir multiplos itens, primeiro exclua o item do tipo faixa de números.')
		return -1
	}
	// Se está tentando incluir uma faixa de numeros
	if( this._isFaixaDeNumero( newText ) ) {
		if( !isEmptyList && !isEditingOnlyItem ) {
			alert('Você está tentando incluir uma faixa de números, porém já existem outros itens definidos. Uma faixa de números não pode co-existir com outros items. Exclua os outros itens primeiro.')
			return -1
		} else {
			return 1
		}
	}
	else {
		return 0
	}
}



/**
 * Verifica se o parametro passdo é uma faixa de números
 */
ControllerSelectEdit.prototype._isFaixaDeNumero = function( text ) {
	console.log({text})
	if( this.options.faixaNumRegexp.test( text ) ) {
		let arr = text.replace(/[Ff]aixa(\s)*::/,'').split(/a/)
		console.log( {arr} )
		return arr.length == 2 && parseInt( arr[0] ) != NaN && parseInt( arr[1] ) != NaN
	}
}



ControllerSelectEdit.prototype._existeFaixaDeNumeros = function() {
	let existe = false
	for( DOB of this.data.current ) {
		existe = this._isFaixaDeNumero( DOB[this.refs.textColumn] )
	}
	return existe
	//return (this.data.current.length > 0) && this._isFaixaDeNumero( this.data.current[0][this.refs.textColumn] )
}



ControllerSelectEdit.prototype._formatFaixaDeNumeros = function( text ) {
	let arr = text.replace(/[Ff]aixa(\s)*::/,'').split(/a/)
	return `Faixa :: ${arr[0].trim()} a ${arr[1].trim()}`
}



ControllerSelectEdit.prototype._addDOB = function( DOB ) {
	this.data.all.push( DOB )
	this.data.current.push( DOB )
}



ControllerSelectEdit.prototype._clickBtDel = function( ev ) {
	let ctrl = ev.target.controller
	let slcBox = ctrl.view.selectBox
	let selected = slcBox.options.item( slcBox.selectedIndex )
	// if there's an item selected and if that item has an associated DOB
	// (meaning it will not work when nothing or the 'new' option is selected)
	if( selected && selected.DOB ) {
		ctrl._deleteByIndex( slcBox.selectedIndex )
	}
}



ControllerSelectEdit.prototype._deleteByIndex = function( slcIndex ) {
	let r = this.refs, v = this.view, d = this.data
	let DOB = v.selectBox.selectedOptions[0].DOB
	// chama a funcao de delete externa
	this._externalDelete( DOB, r.pkColumn )
	// remove o item da view
	v.selectBox.remove( slcIndex )
	// remove o item do data array
	d.all = d.all.filter( item => item != DOB )
	d.current = d.current.filter( item => item != DOB )
	// seleciona o proximo item
	v.selectBox.selectedIndex = Math.min(slcIndex, d.current.length+1)
	// atualiza o child
	this._deleteChildDOBsWithFkValue( DOB[r.pkColumn] )
	this._callOnChangeHooks()
}



ControllerSelectEdit.prototype._externalDelete = async function( DOB, pkColumn ) {
	let l = this.logic
	if( typeof l.onDelete === "function" ) {
		let res = await l.onDelete( DOB, pkColumn )
		if( res.err ) {
			alert( "Ocorreu um erro ao tentar deletar o item" )
			throw res.err
		}
		console.log( 'Itens excluídos: ' + res.deleted )
	}
}



ControllerSelectEdit.prototype._deleteChildDOBsWithFkValue = function( fkValue ) {
	if( this._child instanceof ControllerSelectEdit ) {
		let d = this.data
		let fkColumn = this._child.refs.fkColumn
		d.all = d.all.filter( item => item[fkColumn] != fkValue )
		d.current = d.current.filter( item => item[fkColumn] != fkValue )
		this.updateChild()
	}
}



ControllerSelectEdit.prototype._deleteByFK = function( fkValue, newFKvalue ) {
	let fkColumn = this.refs.fkColumn
	if( fkValue ) {
		this.data.all = this.data.all.filter(
			item => item[fkColumn] != fkValue
		)
	}
	if (!newFKvalue ) {
		this.refs.fkValue = null
	}
	this.render()
}


module.exports = ControllerSelectEdit



/*
ControllerSelectEdit.prototype._clickBtDel_OLD =  async function( ev ) {
	let ctrl = ev.target.controller
	let r = ctrl.refs, v = ctrl.view, l = ctrl.logic, d = ctrl.data
	let selectedIndex = v.selectBox.selectedIndex
	let selected = v.selectBox.options.item( v.selectBox.selectedIndex )
	
	// if there's an item selected and if that item has an associated DOB
	// (meaning it will not work when nothing or the 'new' option is selected)
	if( selected && selected.DOB ) {
		if( typeof l.onDelete === "function" ) {
			let res = await l.onDelete( selected.DOB, r.pkColumn )
			if( res.err ) {
				alert( "Ocorreu um erro ao tentar deletar item" )
				throw res.err
			}
			console.log( 'Itens excluídos: ' + res.deleted )
		}
		v.selectBox.remove( v.selectBox.selectedIndex )
		// remove o item do data array
		for( let i = 0; i < d.all.length; i++) {
			if ( d.current[i] && d.current[i] === selected.DOB)
				d.current.splice(i, 1)
			if ( d.all[i] === selected.DOB)
				d.all.splice(i, 1)
		}
		// seleciona o proximo item
		v.selectBox.selectedIndex = Math.min(selectedIndex, d.current.length+1)
		// atualiza o child
		ctrl._deleteChildDataWithFkValue( selected.DOB[r.pkColumn] )
	}
}
*/