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
app.get('/a:area_name', getRecipesByArea);
app.get('/c:category_name', getRecipesByCategory);
app.get('/d:id', getById);
app.get('/recipes', getRecipes);
app.get('/recipes/add', addRecipes);
app.post('/recipes', addRecipe);
app.get('/recipes/:id', getDetails);
app.post('/recipes/:id', ReadRecipe);
app.put('/recipes/:id', updateDetails);
app.delete('/recipes/:id', deleteRecipe);
app.get('/bookmarks', getBookmarks);
app.post('/bookmarks/:id', addBookmark);
app.get('/bookmarks/:id', getBookmarkDetails);
app.delete('/bookmarks/:id', deleteBookmark);



function getById(request, response) {
    let id = request.params.id;
    let urlById = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
    superagent.get(urlById).then(data => {
        let result = data.body.meals.map(element => {
            return new RecipeDetails(element);
        });
        response.render('pages/searches/detail', {
            recipesDetails: result
        });
    }).catch(handleError);
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
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${searchKey}`;
    } else if (sortBy === 'category') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${searchKey}`;
    } else if (sortBy === 'area') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${searchKey}`;
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

function getRecipesByArea(request, response) {
    const areaName = request.params.area_name;
    let url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${areaName}`;
    superagent.get(url).then(data => {
        let result = data.body.meals.map(element => {
            return new Recipes(element)
        });
        response.render('pages/searches/show', {
            recipesDetails: result
        });
    }).catch(handleError);
}

function getRecipesByCategory(request, response) {
    const categoryName = request.params.category_name;
    let url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${categoryName}`;
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
function getRecipes(request, response) {
    const sql = 'SELECT * FROM recipes;';
    client.query(sql).then(data => response.render('pages/recipes/show', { recipesList: data.rows }));
}

function getDetails(request, response) {
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data =>{
        let ingrArr = stringToArray(data.rows[0].ingredients);
        response.render('pages/recipes/details', { recipe: data.rows[0], ingrArr })
    })

}

function ReadRecipe(request, response) {
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data =>{
        let ingrArr = stringToArray(data.rows[0].ingredients);
        console.log(ingrArr);
        response.render('pages/recipes/edit', { recipesList: data.rows[0],ingrArr })})
}

function updateDetails(request, response) {
    const { name, image_url, category, instructions, area, ingredients, video_url } = request.body;
    const sql = 'UPDATE recipes SET name=$1, category=$2, area=$3, image_url=$4,video_url=$5, ingredients=$6, instructions=$7 WHERE id=$8 ;';
    const parameter = [name, category, area, image_url, video_url, ingredients, instructions, request.params.id];
    client.query(sql, parameter).then(() => {
        response.redirect(`/recipes/${parameter[7]}`)
    }).catch(handleError);
}

function deleteRecipe(request, response) {
    const parameter = request.params.id;
    const sql = 'DELETE FROM recipes WHERE id=$1';
    client.query(sql, [parameter]).then(() => {
        response.redirect('/recipes');
    }).catch(handleError);
}

function addRecipe(request, response) {
    let ingredients=[]
    
    const { name, image_url, category, instructions, area, ingredient, measure, video_url } = request.body;
    for (let i=0; i<ingredient.length;i++){
        let str=`${measure[i]}+${ingredient[i]}`;
        ingredients.push(str)
    }
    const sql = 'INSERT INTO recipes (name, category, area, image_url, video_url, ingredients, instructions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;'
    const parameter = [name, category, area, image_url, video_url, ingredients, instructions];
    client.query(sql, parameter).then((data) => {
        response.redirect(`/recipes/${data.rows[0].id}`)
    }).catch(handleError);
}

function addRecipes(request, response) {
    response.render('pages/recipes/add')
}

// Bookmarks (Batool)
function getBookmarks(request, response) {
    const sql = 'SELECT * FROM bookmarks;';
    client.query(sql).then(data => response.render('pages/bookmarks/show', { bookmarksList: data.rows }));
}

function getBookmarkDetails(request, response) {
    const sql = 'SELECT * FROM bookmarks WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => {
        let ingrArr = stringToArray(data.rows[0].ingredients);
        response.render('pages/bookmarks/details', { bookmark: data.rows[0], ingrArr })
    })
}

function addBookmark(request, response) {
    let id = request.params.id;
    let urlById = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
    superagent.get(urlById).then(data => {
        let result = data.body.meals.map(element => {
            return new RecipeDetails(element);
        });
        const { id, name, category, area, image_url, video_url, instructions, ingredients } = result[0];
        const sql = 'INSERT INTO bookmarks (id, name, category, area, image_url, video_url, ingredients, instructions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;'
        const parameter = [id, name, category, area, image_url, video_url, ingredients, instructions];
        client.query(sql, parameter).then((data) => {
            response.redirect(`/d${id}`)
        }).catch(handleError);
    }).catch(handleError);
}

function deleteBookmark(request, response) {
    const parameter = request.params.id;
    const sql = 'DELETE FROM bookmarks WHERE id=$1';
    client.query(sql, [parameter]).then(() => {
        response.redirect('/bookmarks');
    }).catch(handleError);
}


function homePage(request, response) {
    response.render('pages/index');
}

function Recipes(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal || 'No Name Available';
    this.image_url = data.strMealThumb || 'No Image Available';
}

function RecipeDetails(data) {
    this.id = data.idMeal;
    this.name = data.strMeal;
    this.category = data.strCategory;
    this.area = data.strArea;
    this.image_url = data.strMealThumb;
    this.video_url = data.strYoutube.replace("watch", "embed");
    this.instructions = data.strInstructions;
    this.ingredients = getIngrArr(data) || [];
}

function handleError() {
    response.status(500).send('Something Went Wrong');
}

//helper functions
function getIngrArr(data) {
    let ingredients = [];
    for (let i = 0; i < 20; i++) {
        ingredients[i] = `${data[`strMeasure${i + 1}`]}+${data[`strIngredient${i + 1}`]}`;
    }
    let newIngredients = ingredients.filter(value => {
        if (value != '  ' && value != 'null' && value != 'null null' && value != 'null+null' && value != ' ' && value !== '+' && value != ' +' && value !== ',null') {
            return (value);
        }
    })
    return (newIngredients);
}

function stringToArray(str) {
    str = str.replace("{", "");
    str = str.replace("}", "");
    str = str.split(',');
    let arr = str.map(value => {
        value = value.replace("\"", "");
        return (value.replace("\"", ""));
      })
    return(arr);
}
