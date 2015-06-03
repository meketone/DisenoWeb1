# jquery-switchstyle

A quick and easy way to make a CSS style swicher!

## Example 
```html
    <link rel="stylesheet" href="main.style.css">
    <link rel="alternate stylesheet" href="style.1.css" id="style1">
    <link rel="alternate stylesheet" href="style.2.css" id="style2">

    <a href="#" data-style="style1" class="css">Switch to style 1</a><br />
    <a href="#" data-style="style2" class="css">Switch to style 2</a><br />

    <script type="application/javascript">
        $('a.css').switchstyle();
    </script>
```


