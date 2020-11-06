'use strict';

const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
const { request, response } = require('express');
require('dotenv').config();
const methodOverride = require('method-override');
const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(methodOverride('_method'));
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
//app.set('views', 'views/');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
const client = new pg.Client(DATABASE_URL);

client.connect().then(() => {
    app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
}).catch(handleError);

app.get('/', homePage);


////////////sondos
app.get('/recipes', getRecipes)
function getRecipes(request,response){
    const sql = 'SELECT * FROM recipes;';
    client.query(sql).then(data => response.render('pages/recipes/show', { recipesList: data.rows}))
}
app.get('/recipes/:id', getDetails)
function getDetails(request, response) {
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => response.render('pages/recipes/details', { recipe: data.rows[0]}))
  }
  app.post('/recipes/:id', ReadRecipe)
  function ReadRecipe(request,response){
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => response.render('pages/recipes/edit', { recipesList: data.rows[0] }))
  }
  app.put('/recipes/:id', updateDetails);
  function updateDetails(request, response) {
    const { name, image_url, category, instructions, area, ingredients, video_url} = request.body;
    const sql = 'UPDATE recipes SET name=$1, category=$2, area=$3, image_url=$4,video_url=$5, ingredients=$6, instructions=$7 WHERE id=$8 ;';
    const parameter = [name, category, area, image_url, video_url, ingredients, instructions, request.params.id];
    client.query(sql, parameter).then(() => {
      response.redirect(`/recipes/${parameter[7]}`)
    });
  }
  app.delete('/recipes/:id', deleteRecipe);
  function deleteRecipe(request,response){
    const parameter = request.params.id;
    
    const sql = 'DELETE FROM recipes WHERE id=$1';
    client.query(sql, [parameter]).then(()=>{
      response.redirect('/recipes');
    });
  }
  app.post('/recipes', addRecipe)
  function addRecipe(request,response){
    const { name, image_url, category, instructions, area, ingredients, video_url} = request.body;
    const sql='INSERT INTO recipes (name, category, area, image_url, video_url, ingredients, instructions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;'
    const parameter=[name, category, area, image_url, video_url, ingredients, instructions];
    client.query(sql,parameter).then((data)=>{
        response.redirect(`/recipes/${data.rows[0].id}`)

    }).catch(console.error());
  }
  app.get('/add',addRecipes)
  function addRecipes(request,response){
      response.render('pages/recipes/add')
  }
/////////////////////  


function homePage(request, response) {
    response.render('pages/index');
}

function handleError() {
    response.status(500).send('Something Went Wrong');
}
