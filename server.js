'use strict';
// ----------- Library definitions -----------------------
const
    express = require('express'),
    superagent = require('superagent'),
    cors = require('cors'),
    pg = require('pg'),
    bcrypt = require('bcrypt'),
    jwt = require('jsonwebtoken'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    app = express(),
    {request,response} = require('express');

// ---------------------------------------------- 

app.use(cors());
app.options('*', cors());
app.use(bodyParser.json())
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));
require('dotenv').config();

//------------------------------------------------

const
    key = process.env.KEY,
    PORT = process.env.PORT || 3000,
    DATABASE_URL = process.env.DATABASE_URL,
    client = new pg.Client(DATABASE_URL);

//------------------ run the server ---------------------

client.connect().then(() => {
    app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
}).catch(handleError);

// -------------- routs ---------------- 

app.get('/', getRandomRecipes);
app.post('/searches', getDataFromApi);
//----------------------------------------------- filter routs
app.get('/a:area_name', getRecipesByArea);
app.get('/c:category_name', getRecipesByCategory);
app.get('/d:id', getById);
//------------------------------------------------ recipes routs
app.get('/recipe/:id_user', getRecipes);
app.get('/recipes/add', addRecipes);
app.post('/recipes', addRecipe);
app.get('/recipes/:id', getDetails);
app.get('/recipes/:id', ReadRecipe);
app.put('/recipes/:id', updateDetails);
app.delete('/recipes/:id', deleteRecipe);
//-------------------------------------------------- bookmarks routs
app.get('/bookmark/:id_user', getBookmarks);
app.post('/bookmarks/:id', addBookmark);
app.get('/bookmarks/:id', getBookmarkDetails);
app.delete('/bookmarks/:id', deleteBookmark);
//------------------------------------------------- Authentication routs
app.get('/registerForm' , getFormRegister)
app.get('/loginForm' , getFormLogin)
app.post('/register', addInfoUser)
app.post('/login', getInfoUser)

// ------------------- functions for routs (get forms) ----------------------------

function getFormRegister(request,response) {
    response.render('pages/login/signUp')
}

function getFormLogin(request,response) {
    response.render('pages/login/login')
}

function addRecipes(request, response) {
    response.render('pages/recipes/add')
}

function getRandomRecipes(request,response) {
    response.render('pages/index')
} 

// -------------------------------- functions for methods of routs ----------------------------

function getBookmarks(request, response) {
    let id = request.params.id_user;
    console.log(`id from get ${id}`)
    const sql = 'select * from bookmarks where id_user = $1;';
    let safeUser = [id]
    client.query(sql,safeUser).then(data => response.render('pages/bookmarks/show', {
        bookmarksList: data.rows
    }));
}

// ----------------------------------------------------------------------

function getRecipes(request , response) {
    let id = request.params.id_user;
    let sql = `select * from recipes where id_user = $1;`
    let safeUser = [id]
    client.query(sql,safeUser).then(data => response.render('pages/recipes/show', {
        recipesList: data.rows
    }));
}

// -----------------------------------------------------------------------

function getInfoUser(request,response) {
    let password = request.body.password;
    let email = request.body.email;
    let checkPassword = `select id,password from users where email = $1;`
    let safeCheck = [email];
    client.query(checkPassword, safeCheck).then(data => {
        if (data.rows.length > 0) {
            bcrypt.compare(password, data.rows[0].password, (error, CompareDone) => {
                if (CompareDone == true) {
                    let tokenLogin = jwt.sign({ email: email, password: data.rows[0].password }, key)
                    response.send({ status: 200, token: tokenLogin, id: data.rows[0].id })
                } else {
                    response.send({ status: 400 });
                }
            })
        } else {
            response.send({ status: 404 });
        }
    })
}

// -------------------------------------------------------------------------

function addInfoUser(request, response) {
    let name = request.body.name;
    let email = request.body.email;
    let password = request.body.password;
    let sqlCheck = `select * from users where email = $1;`
    let safeCheck = [email]
    client.query(sqlCheck, safeCheck).then(data => {
        if (data.rows.length >= 1) {
            response.send({ status: 226 })
        } else {
            bcrypt.hash(password, 8, (HashingDidNotWork, HashingPasswordWorked) => {
                if (HashingDidNotWork) {
                    response.status(500);
                } else {
                    let sql = 'insert into users (name,email,password) values ($1,$2,$3);'
                    let safeValues = [name, email, HashingPasswordWorked];
                    client.query(sql, safeValues).then(() => {
                        let sqlId = `select * from users where email = $1`
                        let safeId = [email]
                        client.query(sqlId, safeId).then(data => {
                            let id = data.rows[0].id
                            let tokenUser = jwt.sign({ name: name, email: email, password: HashingPasswordWorked }, key)
                            response.send({ status: 201, token: tokenUser, id: id })
                        })

                    })
                }
            });
        }
    })
}

//------------------------------------------------------------------

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

//-------------------------------------------------------------------

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

//-----------------------------------------------------------------------

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

//------------------------------------------------------------------------

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

//---------------------------------------------------------------------

function getDetails(request, response) {
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => {
        let ingrArr = stringToArray(data.rows[0].ingredients);
        response.render('pages/recipes/details', {
            recipe: data.rows[0],
            ingrArr
        })
    })
}

//---------------------------------------------------------------

function ReadRecipe(request, response) {
    const sql = 'SELECT * FROM recipes WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => {
        let ingrArr = stringToArray(data.rows[0].ingredients);
        response.render('pages/recipes/edit', {
            recipesList: data.rows[0],
            ingrArr
        })
    })
}

//------------------------------------------------------------------

function updateDetails(request, response) {
    let ingredients = []
    const {
        name,
        area,
        category,
        instructions,
        image_url,
        video_url,
        measure,
        ingredient
    } = request.body;
    for (let i = 0; i < ingredient.length; i++) {
        let str = `${measure[i]}+${ingredient[i]}`;
        ingredients.push(str)
    }
    const sql = 'UPDATE recipes SET name=$1, category=$2, area=$3, image_url=$4,video_url=$5, ingredients=$6, instructions=$7 WHERE id=$8 ;';
    const parameter = [name, category, area, image_url, video_url, ingredients, instructions, request.params.id];
    client.query(sql, parameter).then(() => {
        response.redirect(`/recipes/${parameter[7]}`)
    }).catch(handleError);
}

//--------------------------------------------------------------------------

function deleteRecipe(request, response) {
    const parameter = request.params.id;
    let id_user = request.body.id_user;
    const sql = 'DELETE FROM recipes WHERE id=$1';
    client.query(sql, [parameter]).then(() => {
        response.redirect(`/recipe/${id_user}`);
    }).catch(handleError);
}

//------------------------------------------------------------------------

function addRecipe(request, response) {
    let ingredients = []

    const {
        name,
        area,
        category,
        instructions,
        image_url,
        video_url,
        measure,
        id_user,
        ingredient
    } = request.body;
    for (let i = 0; i < ingredient.length; i++) {
        let str = `${measure[i]}+${ingredient[i]}`;
        ingredients.push(str)
    }
    const sql = 'INSERT INTO recipes (name, category, area, image_url, video_url, ingredients, instructions,id_user) VALUES ($1, $2, $3, $4, $5, $6, $7 ,$8) RETURNING *;'
    const parameter = [name, category, area, image_url, video_url, ingredients, instructions,id_user];
    client.query(sql, parameter).then((data) => {
        response.redirect(`/recipes/${data.rows[0].id}`)
    }).catch(handleError);
}

//-----------------------------------------------------------------

function getBookmarkDetails(request, response) {
    const sql = 'SELECT * FROM bookmarks WHERE id=$1;';
    const parameter = [request.params.id];
    client.query(sql, parameter).then(data => {
        let ingrArr = stringToArray(data.rows[0].ingredients);
        response.render('pages/bookmarks/details', {
            bookmark: data.rows[0],
            ingrArr
        })
    })
}

//---------------------------------------------------------------

function addBookmark(request, response) {
    let id = request.params.id;
    let id_user = request.body.id_user;
    let sqlStatement = 'SELECT * FROM bookmarks WHERE id=$1;'
    const parameter = [request.params.id];
    client.query(sqlStatement, parameter).then(data => {
        if (data.rows.length > 0) {
            response.redirect(`/d${id}`)
        } else {
            let urlById = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
            superagent.get(urlById).then(data => {
                let result = data.body.meals.map(element => {
                    return new RecipeDetails(element);
                });
                const {
                    id,
                    name,
                    category,
                    area,
                    image_url,
                    video_url,
                    instructions,
                    ingredients
                } = result[0];
                console.log(`id from post ${id_user}`)
                const sql = 'INSERT INTO bookmarks (id, name, category, area, image_url, video_url, ingredients, instructions , id_user) VALUES ($1, $2, $3, $4, $5, $6, $7, $8 ,$9) RETURNING *;'
                const parameter = [id, name, category, area, image_url, video_url, ingredients, instructions ,id_user];
                client.query(sql, parameter).then((data) => {
                    response.redirect(`/d${id}`)
                }).catch(handleError);
            }).catch(handleError);
        }
    })
}

//-----------------------------------------------------------------

function deleteBookmark(request, response) {
    const parameter = request.params.id;
    let id_user = request.body.id_user;
    const sql = 'DELETE FROM bookmarks WHERE id=$1';
    client.query(sql, [parameter]).then(() => {
        response.redirect(`/bookmark/${id_user}`);
    }).catch(handleError);
}

//--------------------------- constructor functions ---------------------------

function Recipes(data) {
    this.id = data.idMeal || 'No ID Available';
    this.name = data.strMeal.substring(0, 28) || 'No Name Available';
    this.image_url = data.strMealThumb || 'No Image Available';
}

function RecipeDetails(data) {
    this.id = data.idMeal;
    this.name = data.strMeal;
    this.category = data.strCategory;
    this.area = data.strArea;
    this.image_url = data.strMealThumb;
    let video = data.strYoutube.replace("watch", "embed");
    this.video_url = video.replace("?v=", "/");
    console.log(this.video_url)
    this.instructions = data.strInstructions;
    this.ingredients = getIngrArr(data) || [];
}

// --------------------- helper functions -------------------------

function handleError() {
    response.status(500).send('Something Went Wrong');
}

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
    return (arr);
}

// ------------------------------------------------------------ 
