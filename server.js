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
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
const client = new pg.Client(DATABASE_URL);
let randomRecipes = [];
client.connect().then(() => {
    app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
}).catch(handleError);

app.get('/', getRandomRecipes);
app.post('/searches', getDataFromApi);
app.get('/details/:id',getById)

function getById(request,response){
    let id = request.params.id;
    let urlById = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;

    superagent.get(urlById).then(data => {
        let result = data.body.meals.map(element => {
            return new RecipeDetails(element)
        });
        response.render('pages/searches/detail', {
            recipesDetails: result
        });
    })
}

function getRandomRecipes(request, response) {
    let urls = [`https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`,
        `https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`,
        `https://www.themealdb.com/api/json/v1/1/random.php`, `https://www.themealdb.com/api/json/v1/1/random.php`]

    for (let i = 0; i < 6; i++) {
        superagent.get(urls[i]).then(data => {
            data.body.meals.map(element => {
                randomRecipes.push(new Recipes(element))
            });
        }).catch(handleError);
    }

    if (randomRecipes.length > 7) {
        randomRecipes = [];
    }

    response.render('pages/index', {
        recipesRandomly: randomRecipes
    });
}

function getDataFromApi(request, response) {
    let searchKey = request.body.search;
    let sortBy = request.body.sort;
    let url;
    if (sortBy === 'name') {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${searchKey}`
    } else if (sortBy === 'category') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${searchKey}`
    } else if (sortBy === 'area') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${searchKey}`
    }

    superagent.get(url).then(data => {
        let result = data.body.meals.map(element => {
            return new Recipes(element)
        });
        response.render('pages/searches/show', {
            recipesDetails: result
        });
    }).catch(handleError);
}

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

function Recipes(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal || 'No Name Available';
    this.image_url = data.strMealThumb || 'No Image Available';
}

function RecipeDetails(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal || 'No Name Available';
    this.category = data.strCategory || 'No category Available'
    this.area = data.strArea || 'No Origin Available';
    this.image_url = data.strMealThumb || 'No Image Available';
    this.video_url = data.strYoutube.replace("watch", "embed") || 'No Video Available';
    this.instructions = data.strInstructions || 'No instructions Available';
    this.ingredients = getIngrArr(data) || 'No Ingredients Available';
}

function handleError() {
    response.status(500).send('Something Went Wrong');
}

//helper functions
function getIngrArr(data) {
    let ingredientsPicture = [];
    let ingredientsMeasure = [];
    for (let i = 0; i < 20; i++) {
        ingredientsPicture[i] = `${data[`strIngredient${i + 1}`]}`;
        ingredientsMeasure[i] = `${data[`strMeasure${i + 1}`]}`;
    }
    let newIngredients = ingredientsPicture.filter(value => {
        if (value != '  ' && value != 'null null' && value != ' ') {
            return (value);
        }
    })
    let newIngredientsMeasure = ingredientsMeasure.filter(value => {
        if (value != '  ' && value != 'null null' && value != ' ') {
            return (value);
        }
    })
    return ({
        ingredientsPicture : newIngredients,
        ingredientsMeasure : newIngredientsMeasure
    });
}

